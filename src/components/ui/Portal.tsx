import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface PortalProps {
  children: React.ReactNode;
}

export const Portal: React.FC<PortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (Platform.OS === 'web' && mounted) {
    // On web, we can use createPortal
    const ReactDOM = require('react-dom');
    const portalRoot = document.getElementById('portal-root') || document.body;
    return ReactDOM.createPortal(children, portalRoot);
  }

  // On native, just render normally (React Native handles layering)
  return <>{children}</>;
};