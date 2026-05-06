import React, { useState, useEffect, lazy, Suspense } from 'react';
import { getToken, auth } from './api.js';
import AuthScreen from './AuthScreen.jsx';
import WealthlyApp from './WealthlyApp.jsx';
import { isDemoMode, disableDemoMode } from './demoData.js';

const BankCallback = lazy(() => import('./BankCallback.jsx'));

export default function App() {
  const [authState, setAuthState] = useState('checking'); // checking | authed | unauthed | demo
  const [refreshKey, setRefreshKey] = useState(0);
  const [isBankCallback, setIsBankCallback] = useState(
    typeof window !== 'undefined' && window.location.pathname === '/bank-callback'
  );

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
      // Optimistic auth: assume the token is valid and let WealthlyApp render
      // immediately. This avoids a full UI freeze while a cold Railway backend
      // takes 10-30s to respond to /auth/me. If the token is actually stale,
      // the first real API call (reloadAll inside WealthlyApp) will throw 401
      // and we'll catch it below to redirect.
      setAuthState('authed');
      auth.me().catch(() => {
        // Token is invalid/expired — bounce back to AuthScreen.
        setAuthState('unauthed');
      });
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
        background: '#0a0b0e',
        color: '#8c8a85',
        fontFamily: "'DM Sans', system-ui, sans-serif",
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

  if (isBankCallback) {
    return (
      <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0b0e',color:'#8c8a85',fontFamily:"'DM Sans', system-ui, sans-serif",fontSize:14}}>Chargement…</div>}>
        <BankCallback
          onDone={() => {
            setIsBankCallback(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      </Suspense>
    );
  }

  return <WealthlyApp />;
}
