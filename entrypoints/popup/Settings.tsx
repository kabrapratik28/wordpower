import React, { useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from '../utils/useTheme';
import { OllamaSettings } from '../components/OllamaSettings';

function Settings() {
  const theme = useTheme();

  const openAdvancedSettings = () => {
    browser.tabs.create({ url: browser.runtime.getURL('prompt-settings.html') });
  };
  
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  return (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Settings</h2>
            <button onClick={openAdvancedSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <SettingsIcon size={20} color={theme === 'dark' ? '#f9fafb' : '#111827'} />
            </button>
        </div>
      
      <OllamaSettings />
    </div>
  );
}

export default Settings;