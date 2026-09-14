import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.ciurma',
  appName: 'Ciurma',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
