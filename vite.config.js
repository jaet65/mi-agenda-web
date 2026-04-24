import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    https: false,
    port: 5173,
    host: true,
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
});
