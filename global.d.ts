export {};

interface DecryptProps {
  file: string;
  originalFilename: string;
  outDir: string;
  wrappedKey: string;
  aesIv: string;
  encryptedPasskey: string;
}

declare global {
  interface Window {
    electron: {
      getPassword: (encrypted: string) => string;
      setPassword: (password: string) => string;
      openFile: () => Promise<string>;
      openFolder: () => Promise<string>;
      hasPemKey: () => boolean;
      setPemKey: (filepath: string) => Promise<boolean>;
      notifyReactReady: () => void;
      decryptFile: (props: DecryptProps) => Promise<boolean>;
      loadKeys: (props: {
        hash: string;
        encryptedPassKey: string;
      }) => Record<string, string>;
      exit: (code: number) => void;
    };
  }
}
