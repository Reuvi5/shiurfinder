import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // Read .env from the repo root, so the server and website share one file.
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 5173,
  },
});
