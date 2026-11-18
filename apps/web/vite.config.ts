import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // One .env at the repo root serves both the server and the website.
  envDir: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      // The shared contract is TypeScript source, not a built package.
      '@shiurfinder/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
