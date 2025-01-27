"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { BookKey, Upload, type File } from "lucide-react";
import { Button } from "./ui/button";
import AesKeyAndIvDialog from "./aes-key-iv-dialog";

export default function DragDropUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [wrappedKey, setWrappedKey] = useState<string | null>(null);
  const [aesIv, setAesIv] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleKeySubmit = useCallback(
    ({
      wrappedKey,
      aesIv,
      filename,
    }: {
      wrappedKey: string;
      aesIv: string;
      filename: string;
    }) => {
      setWrappedKey(wrappedKey);
      setAesIv(aesIv);
      setFilename(filename);
    },
    []
  );

  const handleDecrypt = useCallback(async () => {
    // select output folder
    const outDir = await window.electron.openFolder();
    if (!outDir) {
      alert("No save folder selected. Quitting...");
      return;
    }

    const payload = {
      file,
      originalFilename: filename,
      outDir,
      wrappedKey,
      aesIv,
      encryptedPasskey: localStorage.getItem("pem-key"),
    };

    try {
      setLoading(true);

      const res = await window.electron.decryptFile(payload);
      if (res === false) {
        throw new Error("Decryption unsuccessful");
      }

      alert(
        `File decrypted successfully at "${payload.outDir}/${payload.originalFilename}"`
      );
    } catch (e) {
      console.error("error decrypting file", e);
      if (e instanceof Error) {
        alert(e.message);
      }
    } finally {
      setLoading(false);
    }

    // Ask the main application to decrypt file
  }, [wrappedKey, aesIv]);

  const handleFileSelect = useCallback(async () => {
    if (!window.electron) {
      return;
    }

    const filepath = await window.electron.openFile();
    if (filepath) {
      if (file !== filepath) {
        setWrappedKey(null);
        setAesIv(null);
      }

      setFile(filepath);
    }
  }, []);

  const handleDrop = () => {
    //
  };

  const handleChange = () => {
    //
  };

  return (
    <>
      <div
        className="flex items-center justify-center bg-gray-100 p-4 rounded-sm"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <label
          onClick={handleFileSelect}
          className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-gray-300 bg-gray-50 hover:bg-gray-100"
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload
              className={`w-10 h-10 mb-3 ${
                isDragging ? "text-primary" : "text-gray-400"
              }`}
            />
            <p
              className={`mb-2 text-sm ${
                isDragging ? "text-primary" : "text-gray-500"
              }`}
            >
              <span className="font-semibold">Click to select a file</span> or
              drag and drop
            </p>
            <p
              className={`text-xs ${
                isDragging ? "text-primary" : "text-gray-500"
              }`}
            >
              Place the encrypted file in here
            </p>
          </div>
          {file && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">File selected:</p>
              <p className="text-sm font-semibold text-gray-700">{file}</p>
            </div>
          )}
        </label>
      </div>
      <div className="py-4 flex flex-col gap-4">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={file === null}
          onClick={handleDecrypt}
        >
          <BookKey /> Decrypt file
        </Button>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={async () => {
            const res = await window.electron.allFiles();
            console.log({ res });
          }}
        >
          <BookKey /> Get All Files
        </Button>
      </div>
      {file && (
        <AesKeyAndIvDialog
          file={file}
          open={!wrappedKey || !aesIv}
          onSubmit={handleKeySubmit}
          onCancel={() => setFile(null)}
        />
      )}
    </>
  );
}
