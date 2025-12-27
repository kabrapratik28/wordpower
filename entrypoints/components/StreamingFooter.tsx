import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { useTheme } from '../utils/useTheme';

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
  const theme = useTheme();

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'ollama-chunk') {
        if (isStreaming) setStreamedText((prev) => prev + message.payload.content);
        if (message.payload.done) setIsStreaming(false);
      } else if (message.type === 'ollama-error') {
        setError(`Error: ${message.payload.message}`);
        setIsStreaming(false);
      }
    };
    browser.runtime.onMessage.addListener(messageListener);
    return () => browser.runtime.onMessage.removeListener(messageListener);
  }, [isStreaming]);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [streamedText]);

  const handleInsert = () => {
    if (streamedText) onInsert(streamedText);
  };
  
  const handleStop = () => {
    setIsStreaming(false);
    onStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isStreaming && streamedText) {
      e.preventDefault();
      e.stopPropagation();
      handleInsert();
    }
  };
  
  const colors = {
      light: {
        cardBg: 'white',
        text: '#111827',
        border: '#e5e7eb',
        responseBg: '#f9fafb',
        buttonText: 'white',
        buttonBg: '#111827',
        secondaryButtonBg: 'white',
        secondaryButtonText: '#374151',
      },
      dark: {
        cardBg: '#1f2937', // gray-800
        text: '#f9fafb', // gray-50
        border: '#4b5563', // gray-600
        responseBg: '#374151', // gray-700
        buttonText: '#1f2937', // gray-800
        buttonBg: '#d1d5db', // gray-300
        secondaryButtonBg: '#4b5563', // gray-600
        secondaryButtonText: '#f9fafb', // gray-50
      }
  };
  const currentColors = colors[theme];

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="wordpower-card"
      style={{
          outline: 'none',
          backgroundColor: currentColors.cardBg,
          borderColor: currentColors.border,
          color: currentColors.text,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={responseRef} style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '12px', padding: '8px', backgroundColor: currentColors.responseBg, borderRadius: '0.375rem', border: `1px solid ${currentColors.border}`, minHeight: '60px', whiteSpace: 'pre-wrap', wordWrap: 'break-word', color: currentColors.text }}>
        {error ? <div style={{ color: '#ef4444' }}>{error}</div> : streamedText}
        {isStreaming && !error && (
          streamedText.length === 0 ? (
            <span style={{ animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite', color: currentColors.text }}>AI model working hard to generate response ...</span>
          ) : (
            <span style={{ animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite', color: currentColors.text }}>▋</span>
          )
        )}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        {isStreaming && <button onClick={handleStop} style={{ padding: '8px 12px', border: `1px solid ${currentColors.border}`, background: currentColors.secondaryButtonBg, color: currentColors.secondaryButtonText, borderRadius: '6px', cursor: 'pointer' }}>Stop</button>}
        <button 
          onClick={handleInsert} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', fontSize: '0.9rem', fontWeight: 500, borderRadius: '0.375rem', border: 'none', cursor: 'pointer', backgroundColor: currentColors.buttonBg, color: currentColors.buttonText, opacity: isStreaming || !streamedText ? 0.6 : 1 }}
          disabled={isStreaming || !streamedText}
        >
          <span>Insert</span>
          <CornerDownLeft size={16} />
        </button>
        <button onClick={onClose} style={{ padding: '8px 12px', border: `1px solid ${currentColors.border}`, background: currentColors.secondaryButtonBg, color: currentColors.secondaryButtonText, borderRadius: '6px', cursor: 'pointer' }}>Close (Esc)</button>
      </div>
    </div>
  );
}
