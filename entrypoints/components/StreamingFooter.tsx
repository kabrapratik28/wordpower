// entrypoints/components/StreamingFooter.tsx
import { useState, useEffect, useRef } from 'react';

interface StreamingFooterProps {
  initialPrompt: string;
  onInsert: (text: string) => void;
  onClose: () => void;
  onStop: () => void;
}

const footerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '0',
  left: '0',
  width: '100%',
  backgroundColor: '#f9f9f9',
  borderTop: '1px solid #ddd',
  boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
  zIndex: 2147483647, // Max z-index
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'sans-serif',
  fontSize: '14px',
  color: '#333',
};

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  marginBottom: '12px',
};

const buttonStyle: React.CSSProperties = {
  marginLeft: '8px',
  padding: '8px 16px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const responseAreaStyle: React.CSSProperties = {
  maxHeight: '200px',
  overflowY: 'auto',
  border: '1px solid #eee',
  padding: '8px',
  backgroundColor: '#fff',
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
  minHeight: '50px',
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#888',
};

export function StreamingFooter({ onInsert, onClose, onStop }: StreamingFooterProps) {
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'ollama-chunk') {
        if (isStreaming) { // Only update if still streaming
          setStreamedText((prev) => prev + message.payload.content);
        }
        if (message.payload.done) {
          setIsStreaming(false);
        }
      } else if (message.type === 'ollama-error') {
        setError(`Ollama Error: ${message.payload.message}. Is Ollama running and the model available?`);
        setIsStreaming(false);
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    // Auto-scroll to bottom
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }

    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, [isStreaming]);

  const handleInsert = () => {
    onInsert(streamedText);
    onClose();
  };
  
  const handleStop = () => {
    setIsStreaming(false); // Immediately stop updating the UI
    onStop(); // Tell the background to abort
  };

  const handleClose = () => {
    if (isStreaming) {
      handleStop(); // Also stop the stream if closing
    }
    onClose();
  };

  return (
    <div style={footerStyle}>
      <div style={controlsStyle}>
        {isStreaming && <button onClick={handleStop} style={buttonStyle}>Stop</button>}
        <button 
          onClick={handleInsert} 
          style={{ ...buttonStyle, cursor: streamedText.length === 0 ? 'not-allowed' : 'pointer' }}
          disabled={streamedText.length === 0}
        >
          Insert
        </button>
        <button onClick={handleClose} style={buttonStyle}>Close</button>
      </div>
      <div ref={responseRef} style={responseAreaStyle}>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {!error && streamedText}
        {isStreaming && !error && (
          <div style={loadingStyle}>
            <span>.</span><span>.</span><span>.</span>
          </div>
        )}
      </div>
    </div>
  );
}
