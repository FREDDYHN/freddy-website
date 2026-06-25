import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'pages/faq': resolve(__dirname, 'pages/faq.html'),
        'pages/download': resolve(__dirname, 'pages/download.html'),
        'pages/services-battery': resolve(__dirname, 'pages/services-battery.html'),
        'pages/services-weee': resolve(__dirname, 'pages/services-weee.html'),
        'pages/services-packaging': resolve(__dirname, 'pages/services-packaging.html'),
        'pages/calculator': resolve(__dirname, 'pages/calculator.html'),
        'pages/forms': resolve(__dirname, 'pages/forms.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
