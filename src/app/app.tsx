import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AskPasswordDialog from "./ask-password";
import DragDropUpload from "./components/drag-and-drop-upload";

function App() {
  const [pemAvailable, setPemAvailable] = useState(false);

  // Check for PEM key
  useEffect(() => {
    if (!window.electron) {
      return;
    }

    if (window.electron.hasPemKey()) {
      return;
    }

    const fetchPemKeyPath = async () => {
      const filepath = await window.electron.openFile();
      if (filepath) {
        window.electron.setPemKey(filepath);
      } else {
        window.electron.exit(1);
      }
    };

    fetchPemKeyPath();
  }, []);

  useEffect(() => {
    const fetchPassword = async () => {
      const encryptedPassword = localStorage.getItem("pem-key");
      if (!encryptedPassword) return;

      const password = await window.electron.getPassword(encryptedPassword);
      if (password) {
        setPemAvailable(true);
      }
    };

    if (window.electron) {
      window.electron.notifyReactReady();

      fetchPassword();
    }
  }, []);

  const handleSetPassword = async (passkey: string) => {
    if (!window.electron || passkey.trim().length === 0) return;

    const encryptedPassword = await window.electron.setPassword(passkey);
    if (!encryptedPassword) return;

    localStorage.setItem("pem-key", encryptedPassword);

    setPemAvailable(true);
  };

  return (
    <div className="app-container min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <main className="container mx-auto px-4 py-2">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-purple-800 select-none">
            Decrypt Client Files
          </h1>
          <p className="text-xl mb-8 text-gray-600 select-none">
            Secure, client-side encrypted, and ephemeral file sharing at your
            fingertips
          </p>
        </div>
        <AskPasswordDialog
          open={pemAvailable === false}
          onSubmit={handleSetPassword}
        />
        <DragDropUpload />
      </main>
    </div>
  );
}

const root = createRoot(document.body);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
