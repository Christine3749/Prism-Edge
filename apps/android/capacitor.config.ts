import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.msir.prism.app',
  appName: 'MSIR Prism',
  webDir: '../../dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
