import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the app works on GitHub Pages for any repo name/casing
  base: './',
});
