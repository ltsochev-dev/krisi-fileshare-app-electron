import { createRoot } from "react-dom/client";

const root = createRoot(document.body);
root.render(
  <div className="flex">
    <h1 className="text-3xl">💖 Hello World!</h1>
    <p className="text-xl">Welcome to your Electron application.</p>
  </div>
);
