import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    async function readPreference() {
      const preference = await AccessibilityInfo.isReduceMotionEnabled();
      if (active) setEnabled(preference);
    }
    void readPreference();
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setEnabled);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
