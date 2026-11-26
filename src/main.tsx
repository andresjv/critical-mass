import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Self-hosted fonts via @fontsource npm packages.
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
