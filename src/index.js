import './colors.css';
import './config.css';
import './index.css';

import App from './App';
import React from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);