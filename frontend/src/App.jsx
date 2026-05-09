import React, { useState, useEffect, lazy, Suspense } from 'react';
import { getToken, auth } from './api.js';
import AuthScreen from './AuthScreen.jsx';
import WealthlyApp from './WealthlyApp.jsx';
import { isDemoMode, disableDemoMode, enableDemoMode } from './demoData.js';

const BankCallback = lazy(() => import('./BankCallback.jsx'));
const Landing = lazy(() => import('./views/Landing.jsx'));

export default function App() {
  const [authState, setAuthState] = useState('checking'); // checking | authed | unauthed | demo
  // When unauthed, decide whether to show the public marketing landing or
  // jump straight to the auth form. Default to the landing — auth is one
  // click away via the nav.
  const [unauthedView, setUnauthedView] = useState('landing'); // landing | auth
  const [authInitialMode, setAuthInitialMode] = useState('login');
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
        setUnauthedView('auth');
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
      // Don't redirect on network errors (cold Railway backend on mobile).
      // api.js already handles expired tokens: 401 → clearToken + reload.
      auth.me().catch(() => {});
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
        background: '#151926',
        color: '#8c8a85',
        fontFamily: "'Inter Tight', system-ui, sans-serif",
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
    if (unauthedView === 'landing') {
      return (
        <Suspense fallback={<div style={{minHeight:'100vh',background:'#151926'}}/>}>
          <Landing
            onSignIn={() => { setAuthInitialMode('login'); setUnauthedView('auth'); }}
            onSignUp={() => { setAuthInitialMode('register'); setUnauthedView('auth'); }}
            onTryDemo={() => { enableDemoMode(); setAuthState('demo'); }}
          />
        </Suspense>
      );
    }
    return (
      <AuthScreen
        initialMode={authInitialMode}
        onBackToLanding={() => setUnauthedView('landing')}
        onAuth={() => setAuthState('authed')}
        onTryDemo={() => setAuthState('demo')}
      />
    );
  }

  if (isBankCallback) {
    return (
      <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#151926',color:'#9ea3b3',fontFamily:"'Inter Tight', system-ui, sans-serif",fontSize:14}}>Chargement…</div>}>
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
