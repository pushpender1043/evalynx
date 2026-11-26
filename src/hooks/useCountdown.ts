import { useEffect, useState } from 'react';
import { computeCountdown, type CountdownParts } from '../lib/analytics';

export function useCountdown(targetIso: string): CountdownParts {
  const [countdown, setCountdown] = useState<CountdownParts>(() => computeCountdown(targetIso));

  useEffect(() => {
    setCountdown(computeCountdown(targetIso));
    const timer = window.setInterval(() => {
      setCountdown(computeCountdown(targetIso));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetIso]);

  return countdown;
}
