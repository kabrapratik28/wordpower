import React, { useState, useEffect } from 'react';
import { DEFAULT_MODEL } from '../utils/constants';

function Settings() {
  const [blacklist, setBlacklist] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [ollamaStatus, setOllamaStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [ollamaError, setOllamaError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Load settings from storage on component mount
  useEffect(() => {
    // Load blacklist
    browser.storage.local.get('blacklist').then((result) => {
      if (result.blacklist) {
        setBlacklist(result.blacklist.join('\n'));
      }
    });

    // Load selected model
    browser.storage.local.get('selectedModel').then((result) => {
      if (result.selectedModel) {
        setSelectedModel(result.selectedModel);
      }
    });

    // Get initial Ollama status and models
    browser.runtime.sendMessage({ type: 'getOllamaStatus' }).then(response => {
        handleStatusResponse(response);
    });
     browser.runtime.sendMessage({ type: 'getOllamaModels' }).then(response => {
        handleModelsResponse(response);
    });

    // Listen for status updates from the background script
    const messageListener = (message: any) => {
      if (message.type === 'ollamaStatusUpdate') {
        handleStatusResponse(message.payload);
      }
    };
    browser.runtime.onMessage.addListener(messageListener);
    return () => browser.runtime.onMessage.removeListener(messageListener);

  }, []);

  const handleStatusResponse = (response: any) => {
    if (response.status === 'connected') {
        setOllamaStatus('connected');
        setOllamaError('');
    } else {
        setOllamaStatus('error');
        setOllamaError(response.error);
    }
  };
  
  const handleModelsResponse = (response: any) => {
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
            <p>Please ensure Ollama is running and accessible. For browser connections, you may need to configure CORS. <a href="https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image" target="_blank" rel="noopener noreferrer">Learn more</a>.</p>
          </div>
        )}
        
        <label htmlFor="model-select" style={{marginTop: '16px'}}>Active Model</label>
        <select id="model-select" value={selectedModel} onChange={handleModelChange}>
          {models.length > 0 ? (
            models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))
          ) : (
            <option disabled>No models found</option>
          )}
        </select>
         {models.length === 0 && ollamaStatus === 'connected' && (
            <div className="error-message">
                No models available. Try running `ollama pull ${DEFAULT_MODEL}` in your terminal.
            </div>
        )}
      </div>

      <div className="setting-section">
        <h3>URL Blacklist</h3>
        <label htmlFor="blacklist-textarea">Do not run on these sites (one URL per line):</label>
        <textarea
          id="blacklist-textarea"
          value={blacklist}
          onChange={(e) => setBlacklist(e.target.value)}
          placeholder="e.g., https://google.com"
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
