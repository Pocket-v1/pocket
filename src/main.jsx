import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { Analytics } from '@vercel/analytics/react';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './styles.css';
import './styles/sheets.css';
import './styles/credit.css';
import './design-system/tokens.css';
import './design-system/components.css';
import './design-system/patterns.css';
import './styles/sidebar-collapse.css'
import './styles/fuel-card.css'
import './styles/auth-responsive.css';
import './design-system/motion.css';
import './styles/login.css';

createRoot(document.getElementById('root')).render(<ErrorBoundary><App /><Analytics /></ErrorBoundary>);
import './styles/dark-contrast.css';
import './styles/actions.css';
import './styles/vehicles-motion.css';
