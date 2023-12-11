import adapter from "@sveltejs/adapter-static";

export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  kit: {
    adapter: adapter(),
  },
};
