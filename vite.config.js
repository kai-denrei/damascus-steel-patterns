import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/damascus-steel-patterns/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        v1: resolve(__dirname, 'v1.html'),
        anatomy: resolve(__dirname, 'blade-anatomy.html'),
        welding: resolve(__dirname, 'pattern-welding.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
