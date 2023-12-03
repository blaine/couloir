import { writable } from "svelte/store";

function localStorageStore({ storageKey, initialValue = "" }) {
  const init = localStorage.getItem(storageKey) || initialValue;

  const { subscribe, update, set } = writable(init);

  subscribe((state) => {
    if (state) localStorage.setItem(storageKey, state);
  });

  return {
    subscribe,
    update,
    set,
  };
}

export const nav = localStorageStore({
  storageKey: "chat_nav",
  initialValue: "messages",
});

export const chatTopic = localStorageStore({
  storageKey: "chat_topic",
  initialValue: "snow",
});

export const user = localStorageStore({ storageKey: "chat_user" });
