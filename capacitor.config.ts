import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor utiliza los mismos archivos que genera la compilación web.
const config: CapacitorConfig = {
  appId: 'com.hermes.system',
  appName: 'Hermes System',
  webDir: 'www',
};

export default config;
