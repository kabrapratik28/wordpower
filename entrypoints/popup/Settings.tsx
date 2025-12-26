import React, { useState, useEffect } from 'react';
import { DEFAULT_MODEL } from '../utils/constants';
import { useTheme } from '../utils/useTheme';

function Settings() {
  const [blacklist, setBlacklist] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState<'connected' | 'error'>('error');
  const [ollamaError, setOllamaError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const theme = useTheme();

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Load settings from storage on component mount
  useEffect(() => {
    browser.storage.local.get(['blacklist', 'selectedModel']).then((result) => {
      if (result.blacklist) setBlacklist(result.blacklist.join('\n'));
      setSelectedModel(result.selectedModel || DEFAULT_MODEL);
    });

    const handleStatusUpdate = (message: any) => {
      if (message.type === 'ollamaStatusUpdate') {
        handleStatusResponse(message.payload);
      }
    };
    
    browser.runtime.onMessage.addListener(handleStatusUpdate);

    // Get initial status and models
    browser.runtime.sendMessage({ type: 'getOllamaStatus' }).then(handleStatusResponse);
    browser.runtime.sendMessage({ type: 'getOllamaModels' }).then(handleModelsResponse);

    return () => browser.runtime.onMessage.removeListener(handleStatusUpdate);
  }, []);

  const handleStatusResponse = (response: any) => {
    if (!response) return;
    if (response.status === 'connected') {
        setOllamaStatus('connected');
        setOllamaError('');
    } else {
        setOllamaStatus('error');
        setOllamaError(response.error);
    }
  };
  
  const handleModelsResponse = (response: any) => {
      if (!response) return;
      if(response.models) {
          setModels(response.models);
      } else {
          setModels([]);
          setOllamaError(err => err ? `${err}\n${response.error}`: response.error);
      }
  }

  const handleSaveBlacklist = () => {
    const blacklistArray = blacklist.split('\n').filter(url => url.trim() !== '');
    browser.storage.local.set({ blacklist: blacklistArray }).then(() => {
        showSaveFeedback('Blacklist saved!');
    });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    browser.storage.local.set({ selectedModel: newModel }).then(() => {
        showSaveFeedback('Model saved!');
    });
  };
  
  const showSaveFeedback = (message: string) => {
      setSaveStatus(message);
      setTimeout(() => setSaveStatus(''), 2000);
  }

  return (
    <div>
      <h2>Settings</h2>
      
      <div className="setting-section">
        <h3>Ollama Connection</h3>
        <div className="status-indicator">
          <div className={`status-dot ${ollamaStatus === 'connected' ? 'green' : 'red'}`}></div>
          <span>{ollamaStatus === 'connected' ? 'Connected' : 'Connection Failed'}</span>
        </div>
        
        {ollamaStatus !== 'connected' && (
          <div className="error-message">
            <p>{ollamaError}</p>
            <p>Please ensure Ollama is running and accessible. For browser connections, you may need to configure CORS. <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Learn more</a>.</p>
          </div>
        )}
        
        <label htmlFor="model-select" style={{marginTop: '16px'}}>Active Model</label>
        <select id="model-select" value={selectedModel} onChange={handleModelChange} disabled={models.length === 0}>
          {models.length > 0 ? (
            models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))
          ) : (
            <option disabled>{ollamaStatus === 'connected' ? 'No models found' : 'Not connected'}</option>
          )}
        </select>
         {models.length === 0 && ollamaStatus === 'connected' && (
            <div className="error-message">
                No models available. Try running `ollama pull {DEFAULT_MODEL}` in your terminal.
            </div>
        )}
      </div>

      <div className="setting-section">
        <h3>URL Blacklist</h3>
        <label htmlFor="blacklist-textarea">Do not run on these sites (one URL per line, wildcards `*` supported):</label>
        <textarea
          id="blacklist-textarea"
          value={blacklist}
          onChange={(e) => setBlacklist(e.target.value)}
          placeholder="e.g., https://google.com/*"
        />
        <div style={{display: 'flex', alignItems: 'center', marginTop: '12px'}}>
            <button onClick={handleSaveBlacklist}>Save Blacklist</button>
            {saveStatus && <span className="save-feedback">{saveStatus}</span>}
        </div>
      </div>
    </div>
  );
}

export default Settings;