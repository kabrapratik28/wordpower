import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft, X } from 'lucide-react';
import { PROMPT_PLACEHOLDER } from '../utils/constants';

interface FloatingPromptProps {
  onClose: () => void;
  onSend: (command: string) => void;
  selectedText: string;
}

export default function FloatingPrompt({ onClose, onSend, selectedText }: FloatingPromptProps) {
  const [command, setCommand] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (command.trim()) {
      onSend(command);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent newline in textarea
      e.stopPropagation();
      handleSend();
    }
    // Note: Global Escape is handled by content.tsx
  };

  return (
    <div
      className="wordpower-card"
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#111827' }}>Improve Selection</h3>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: '0.8rem', color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={selectedText}>
          {selectedText}
        </p>
      </div>

      <textarea
        ref={textareaRef}
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PROMPT_PLACEHOLDER}
        style={{ width: '100%', padding: '8px', fontSize: '0.9rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'none', marginBottom: '12px' }}
        rows={2}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSend}
          disabled={!command.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', fontSize: '0.9rem', fontWeight: 500, borderRadius: '0.375rem', border: 'none', cursor: 'pointer', backgroundColor: '#111827', color: 'white', opacity: !command.trim() ? 0.6 : 1 }}
        >
          <span>Send</span>
          <CornerDownLeft size={16} />
        </button>
      </div>
    </div>
  );
}