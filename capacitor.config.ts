import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.96b867df26c64b69a9932b9499465a18',
  appName: 'athleteperformancetracker',
  webDir: 'dist',
  server: {
    url: 'https://96b867df-26c6-4b69-a993-2b9499465a18.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  bundledWebRuntime: false
};

export default config;