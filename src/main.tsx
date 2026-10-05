import { createRoot } from 'react-dom/client';
import App from './App';
import { ticketStats } from './scene/venue/Tickets';
import { startLoop, useSim } from './store';
import './styles.css';

startLoop();

if (import.meta.env.DEV) {
  // Dev probe for driving the sim from the console or a test harness.
  (window as unknown as { __mcoolio: unknown }).__mcoolio = { useSim, ticketStats };
}

// No StrictMode: drei's Html portals unmount synchronously under React 19's double effects.
createRoot(document.getElementById('root')!).render(<App />);
