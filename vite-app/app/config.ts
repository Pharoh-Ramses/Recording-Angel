export const config = {
  apiUrl: import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
  apiToken: import.meta.env.VITE_API_TOKEN || '', // Not used in testing mode
};

// For testing mode, use port 8000 for WebSocket as well
if (!import.meta.env.VITE_WS_URL) {
  config.wsUrl = 'ws://localhost:8000';
}
