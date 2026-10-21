import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React client lives in client/; the built bundle goes to dist/ at the
// project root, where the Express server serves it for `npm start`.
export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
