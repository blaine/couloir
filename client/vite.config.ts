import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      "/messages-list": "http://localhost:3000",
      "/messages": "http://localhost:3000",
    },
  },
});

