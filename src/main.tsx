import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import './index.css';
import App from './App.tsx';

console.log('Amplify Config Check:', {
  region: import.meta.env.VITE_AWS_REGION ? 'Present' : 'Missing',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ? 'Present' : 'Missing',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ? 'Present' : 'Missing',
});

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
