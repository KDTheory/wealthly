import React, { useState, useEffect } from 'react';
import { getToken, auth } from './api.js';
import AuthScreen from './AuthScreen.jsx';
import WealthlyApp from './WealthlyApp.jsx';

export default function App() {
  const [authState, setAuthState] = useState('checking'); // checking | authed | unauthed

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        setAuthState('unauthed');
        return;
      }
      // Verify token is still valid
      try {
        await auth.me();
        setAuthState('authed');
      } catch {
        setAuthState('unauthed');
      }
    })();
  }, []);

  if (authState === 'checking') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafbfc',
        color: '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
      }}>
        Chargement…
      </div>
    );
  }

  if (authState === 'unauthed') {
    return <AuthScreen onAuth={() => setAuthState('authed')} />;
  }

  return <WealthlyApp />;
}
