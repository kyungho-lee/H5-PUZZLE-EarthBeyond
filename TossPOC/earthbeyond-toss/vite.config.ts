import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { cpSync } from 'fs';

function copySrcToDist() {
  return {
    name: 'copy-src-to-dist',
    closeBundle() {
      cpSync('src', 'dist/src', { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [
    legacy({ targets: ['chrome >= 70'] }),
    copySrcToDist(),
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    host: true,
  },
});
