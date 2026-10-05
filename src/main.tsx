import { createRoot } from 'react-dom/client';
import App from './App';
import { startLoop } from './store';
import './styles.css';

startLoop();

// No StrictMode: drei's Html portals unmount synchronously under React 19's double effects.
createRoot(document.getElementById('root')!).render(<App />);
