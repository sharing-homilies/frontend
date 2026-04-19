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
        statsAudience: resolve(__dirname, 'stats-audience.html'),
        statsDevices: resolve(__dirname, 'stats-devices.html'),
        statsThemes: resolve(__dirname, 'stats-themes.html'),
        statsHymns: resolve(__dirname, 'stats-hymns.html'),
        statsContext: resolve(__dirname, 'stats-context.html'),
        statsScripture: resolve(__dirname, 'stats-scripture.html'),
        statsActions: resolve(__dirname, 'stats-actions.html'),
        statsEntities: resolve(__dirname, 'stats-entities.html'),
      },
    },
  },
});
