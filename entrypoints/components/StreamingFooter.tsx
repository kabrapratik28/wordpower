import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft } from 'lucide-react';

interface StreamingFooterProps {
  onInsert: (text: string) => void;
  onClose: () => void;
  onStop: () => void;
}

export function StreamingFooter({ onInsert, onClose, onStop }: StreamingFooterProps) {
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const responseRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus the container on mount to capture keyboard events
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'ollama-chunk') {
        if (isStreaming) {
          setStreamedText((prev) => prev + message.payload.content);
        }
        if (message.payload.done) {
          setIsStreaming(false);
        }
      } else if (message.type === 'ollama-error') {
        setError(`Ollama Error: ${message.payload.message}. Is Ollama running?`);
        setIsStreaming(false);
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    // Auto-scroll response area to bottom
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }

    return () => browser.runtime.onMessage.removeListener(messageListener);
  }, [isStreaming]);

  const handleInsert = () => {
    if (streamedText) {
      onInsert(streamedText);
    }
  };
  
  const handleStop = () => {
    setIsStreaming(false);
    onStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter triggers insert
    if (e.key === 'Enter' && !isStreaming && streamedText) {
      e.preventDefault();
      e.stopPropagation();
      handleInsert();
    }
    // Note: Global Escape is handled by content.tsx
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1} // Make it focusable
      onKeyDown={handleKeyDown}
      className="wordpower-card" // Use shared class from shadow DOM
      style={{ outline: 'none' }} // Hide focus ring
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={responseRef} style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '12px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '0.375rem', border: '1px solid #e5e7eb', minHeight: '60px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
        {error ? <div style={{ color: '#ef4444' }}>{error}</div> : streamedText}
        {isStreaming && !error && (
          <span style={{ animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>▋</span>
        )}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        {isStreaming && <button onClick={handleStop} style={{ padding: '8px 12px', border: '1px solid #d1d5db', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>Stop</button>}
        <button 
          onClick={handleInsert} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', fontSize: '0.9rem', fontWeight: 500, borderRadius: '0.375rem', border: 'none', cursor: 'pointer', backgroundColor: '#111827', color: 'white', opacity: isStreaming || !streamedText ? 0.6 : 1 }}
          disabled={isStreaming || !streamedText}
        >
          <span>Insert</span>
          <CornerDownLeft size={16} />
        </button>
        <button onClick={onClose} style={{ padding: '8px 12px', border: '1px solid #d1d5db', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>Close (Esc)</button>
      </div>
    </div>
  );
}