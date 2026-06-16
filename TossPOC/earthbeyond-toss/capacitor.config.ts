import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zenga.earthbeyond',
  appName: 'Earth Beyond',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
