import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        research: resolve(__dirname, 'research.html'),
        homily: resolve(__dirname, 'homily.html'),
        verifyEmail: resolve(__dirname, 'verify-email.html'),
        diveDeeper: resolve(__dirname, 'dive-deeper.html'),
        counties: resolve(__dirname, 'counties.html'),
        generalStats: resolve(__dirname, 'stats-general.html'),
      },
    },
  },
});
