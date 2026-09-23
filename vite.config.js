import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    port: 5173,
    host: true,
  },
  publicDir: "public",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
