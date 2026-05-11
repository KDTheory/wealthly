import React, { useState, useEffect, useRef } from 'react';

// Tweens between successive numeric values via requestAnimationFrame.
// Wrapped in React.memo because the parent re-renders for unrelated state
// changes (toast, modals, member switch) — we only want this to step when
// the target value actually moves.
export const AnimatedNumber = React.memo(function AnimatedNumber({ value, format, duration = 800 }) {
  const [display, setDisplay] = useState(value);
  const startRef = useRef(null);
  const startValueRef = useRef(value);
  const targetRef = useRef(value);

  useEffect(() => {
    if (Math.abs(targetRef.current - value) < 0.01) return;
    startValueRef.current = display;
    targetRef.current = value;
    startRef.current = null;
    let raf;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (targetRef.current - startValueRef.current) * eased;
      setDisplay(current);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format ? format(display) : display}</>;
});
