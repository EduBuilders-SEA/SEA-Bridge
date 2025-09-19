// Centralized runtime configuration helpers
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '';

  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;

  // Default server-side development URL (matches dev server in project)
  return 'http://localhost:9002';
};

export const config = {
  appUrl: getBaseUrl(),
  wsUrl: (process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace('https://', 'wss://')
    : 'ws://localhost:9002'),
};

export default config;
