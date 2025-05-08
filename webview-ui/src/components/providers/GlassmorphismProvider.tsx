import React, { useEffect } from 'react';
import { useExtensionState } from '../../context/ExtensionStateContext'

const GlassmorphismProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { theme } = useExtensionState();
  const isDarkTheme = theme?.['&']?.includes('dark') || false;
  
  // Adjust glass parameters based on theme
  useEffect(() => {
    document.documentElement.style.setProperty('--glass-opacity', isDarkTheme ? '0.7' : '0.8');
    document.documentElement.style.setProperty('--glass-blur', isDarkTheme ? '10px' : '8px');
    document.documentElement.style.setProperty('--glass-radius', '8px');
    document.documentElement.style.setProperty('--glass-shadow', isDarkTheme ? 
      '0 4px 12px rgba(0, 0, 0, 0.2)' : 
      '0 4px 12px rgba(0, 0, 0, 0.1)');
    document.documentElement.style.setProperty('--glass-border-color', 
      `color-mix(in srgb, var(--vscode-input-border) ${isDarkTheme ? '50%' : '40%'}, transparent)`);
    document.documentElement.style.setProperty('--glass-highlight', 
      `color-mix(in srgb, var(--vscode-focusBorder) ${isDarkTheme ? '10%' : '8%'}, transparent)`);
  }, [isDarkTheme]);
  
  return <>{children}</>;
};

export default GlassmorphismProvider;