import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' + HashRouter: the build runs from any static host or folder (GitHub Pages, Netlify, file share).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
});
