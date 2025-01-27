import { ipcRenderer } from "electron";

(() => {
  const form = document.getElementById("pass-form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = new FormData(e.target as HTMLFormElement);

    ipcRenderer.invoke("set-password", data.get("password"));
  });
})();
