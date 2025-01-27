import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  safeStorage,
  shell,
} from "electron";
import path from "path";
import crypto from "crypto";
import { readFile, writeFile } from "fs/promises";
import started from "electron-squirrel-startup";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let privKey: string = null;
let mainWindow: BrowserWindow = null;
// const isDev = process.env.NODE_ENV === "development";
const DefaultBucket = "krisi-client-uploads" as const;
const S3_SETTINGS_ENCRYPTED = `SA843LONJlMyeK3e34ejOd4C98+kTLhV1USx8GdvudjVgWxh03LXDa9MBSZUYAtdIdCs0hsbVEbvZkvooYX3jTdtlkdN92/g9bzZl4w+Smiwh4y6P/Cl0bjUdzRfPuQo6n+64wTQOzfFu7zC8WfqbLmai0stiriMfeTq1HFTphf+0fiMff5ZHweFjT8WUM1JrGrHLlGdn/6PPYfwkrVg2/ubOxdODXcnqimtdJ4ChN7nDtrrndDmqFa8VP5GXR4k2NKNtXjl7mES9d/RQ0sqvn1KhJwo4VrJuErVhHUtKxpUGhvquEjpS2KAvrxE7Ov2SpQZUzb4LSfEh9seCOml2A==`;
const METADATA_CACHE = new Map<string, Record<string, string>>();

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      // devTools: isDev,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  ipcMain.on("react-ready", () => {
    mainWindow.show();

    registerHandlers(mainWindow);
  });

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  // Check to see if we have a key nearby
  try {
    const pemPath = path.join(process.cwd(), "privKey.pem");
    const file = await readFile(pemPath);
    if (file) {
      privKey = file.toString();
    }
  } catch (e) {
    console.error("Error fetching privKey", e);
  }

  // Check if we have stored passphrase

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

async function decryptFile(
  filepath: string,
  aesKey: crypto.CipherKey,
  aesIv: crypto.BinaryLike
) {
  const encryptedFileBuffer = await readFile(filepath);

  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, aesIv);

  const tagLength = 16;
  const tag = encryptedFileBuffer.slice(encryptedFileBuffer.length - tagLength);
  const encryptedData = encryptedFileBuffer.slice(
    0,
    encryptedFileBuffer.length - tagLength
  );

  // Set the authentication tag
  decipher.setAuthTag(tag);

  const decryptedFile = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decryptedFile;
}
function decryptAesKey(wrappedKey: string, passphrase: string) {
  return crypto.privateDecrypt(
    {
      key: privKey,
      passphrase: passphrase,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(wrappedKey, "base64")
  );
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

function registerHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle("has-pem-key", () => {
    return privKey && typeof privKey === "string" && privKey.length > 0;
  });

  ipcMain.handle("pma-set-key", async (_, filepath: string) => {
    try {
      privKey = (await readFile(filepath)).toString();
      return true;
    } catch (e) {
      console.error("Cannot read privKey file", e);
      return false;
    }
  });

  ipcMain.handle("get-password", (_, encrypted: string) => {
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
    } catch (e) {
      console.error("Error retrieving passkey", e);
      return null;
    }
  });

  ipcMain.handle("set-password", function (_, password: string) {
    if (!password || typeof password !== "string") return;

    try {
      const encryptedPassKey = safeStorage.encryptString(password);
      return encryptedPassKey.toString("base64");
    } catch (e) {
      console.error("Error encrypting the passkey", e);
      console.error(e);
      return null;
    }
  });

  ipcMain.handle("dialog:openFile", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow);
    if (!canceled) {
      return filePaths[0];
    }
  });

  ipcMain.handle("dialog:selectFolder", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (!canceled) {
      return filePaths.at(0);
    }
  });

  ipcMain.handle(
    "s3:getFileKeys",
    async (
      _,
      {
        hash,
        encryptedPassKey,
      }: {
        hash: string;
        encryptedPassKey: string;
      }
    ) => {
      if (METADATA_CACHE.has(hash)) {
        return METADATA_CACHE.get(hash);
      }

      const pemPassword = safeStorage.decryptString(
        Buffer.from(encryptedPassKey, "base64")
      );

      // Decrypt the S3 string
      const buffer = Buffer.from(S3_SETTINGS_ENCRYPTED, "base64");
      const decrypted = crypto.privateDecrypt(
        {
          key: privKey,
          passphrase: pemPassword,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        buffer
      );

      const s3Settings = JSON.parse(decrypted.toString("utf8"));
      const S3Storage = new S3Client(s3Settings);
      const command = new HeadObjectCommand({
        Bucket: "krisi-client-uploads",
        Key: hash,
      });

      try {
        const res = await S3Storage.send(command);
        const payload = {
          filename: res?.Metadata?.["original-filename"] ?? "",
          mimeType: res?.Metadata?.["mimetype"] ?? "",
          aesIv: res?.Metadata?.["aes-iv"] ?? "",
          aesKey: res?.Metadata?.["aes-key"] ?? "",
          extension: res?.Metadata?.["original-extension"] ?? "",
        };

        METADATA_CACHE.set(hash, payload);

        return payload;
      } catch (e) {
        console.error("Error with S3:", e);
        return null;
      }
    }
  );

  ipcMain.handle("app:decrypt", async (_, props: DecryptProps) => {
    const pemPassword = safeStorage.decryptString(
      Buffer.from(props.encryptedPasskey, "base64")
    );

    const iv = Buffer.from(props.aesIv, "base64");
    if (iv.length < 12) {
      console.error("Wrong length for AES IV");
      return false;
    }

    const aesKey = decryptAesKey(props.wrappedKey, pemPassword);
    const file = await decryptFile(props.file, aesKey, iv);

    // Store the file
    const savePath = `${props.outDir}/${props.originalFilename}`;

    await writeFile(savePath, file);

    await shell.showItemInFolder(savePath);

    return true;
  });

  ipcMain.handle("exit", (_, code: number) => {
    process.exit(code);
  });
}
