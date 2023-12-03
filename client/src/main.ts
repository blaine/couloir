import App from "./App.svelte";

document.body.innerHTML = "";

export default new App({
  target: document.body,
});