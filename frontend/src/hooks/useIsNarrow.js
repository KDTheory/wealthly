import { useState, useEffect } from 'react';

// Tracks whether the viewport is below a breakpoint. Used by chart layouts
// (e.g. Sankey margins) where CSS can't reach.
export function useIsNarrow(breakpoint = 760) {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return narrow;
}
