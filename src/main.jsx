import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { initMonitoring, reportError } from './lib/monitoring.js';
import './styles.css';
import './styles/sheets.css';
import './styles/credit.css';
import './design-system/tokens.css';
import './design-system/components.css';
import './styles/sidebar-collapse.css'
import './styles/fuel-card.css'
import './styles/auth-responsive.css';
import './styles/rtl.css';
import { initLang } from './lib/i18n/index.js';

initMonitoring();
window.addEventListener('unhandledrejection', (e) => { reportError(e.reason); });

initLang();
createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);

// Installable app + offline shell (production builds only, so dev hot reload is not cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
