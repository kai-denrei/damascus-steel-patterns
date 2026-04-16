import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/damascus-steel-patterns/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        v2: resolve(__dirname, 'v2.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
