import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prismedge.app',
  appName: 'Prism-Edge',
  webDir: '../../dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
