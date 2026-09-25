import { defineConfig } from "vite";
import { resolve } from "path";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    https: false, // Habilita HTTPS
  },
  plugins: [
    basicSsl() // Genera automáticamente un certificado SSL válido para desarrollo local
  ],
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