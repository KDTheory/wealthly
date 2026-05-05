import React, { useState, useEffect } from 'react';
import { getToken, auth } from './api.js';
import AuthScreen from './AuthScreen.jsx';
import WealthlyApp from './WealthlyApp.jsx';
import { isDemoMode, disableDemoMode } from './demoData.js';

export default function App() {
  const [authState, setAuthState] = useState('checking'); // checking | authed | unauthed | demo
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      // Demo mode wins over everything else — landing in the demo means we
      // skip all auth wiring and feed WealthlyApp a static dataset.
      if (isDemoMode()) {
        setAuthState('demo');
        return;
      }

      // If the URL has a password-reset token, jump straight to the auth
      // screen so the user can set a new password — even if they're
      // already logged in (could be a different account they're recovering).
      const params = new URLSearchParams(window.location.search);
      if (params.get('reset_token')) {
        setAuthState('unauthed');
        return;
      }

      const token = getToken();
      if (!token) {
        setAuthState('unauthed');
        return;
      }
      try {
        await auth.me();
        setAuthState('authed');
      } catch {
        setAuthState('unauthed');
      }
    })();
  }, [refreshKey]);

  const exitDemo = () => {
    disableDemoMode();
    setAuthState('unauthed');
    setRefreshKey((k) => k + 1);
  };

  if (authState === 'checking') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0c0d10',
        color: '#8c8a85',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
      }}>
        Chargement…
      </div>
    );
  }

  if (authState === 'demo') {
    return <WealthlyApp demoMode onExitDemo={exitDemo} />;
  }

  if (authState === 'unauthed') {
    return <AuthScreen onAuth={() => setAuthState('authed')} onTryDemo={() => setAuthState('demo')} />;
  }

  return <WealthlyApp />;
}
