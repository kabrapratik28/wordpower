import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft, X } from 'lucide-react';
import { PROMPT_PLACEHOLDER, PRESET_PROMPTS } from '../utils/constants';
import { AutocompletePopup } from './AutocompletePopup';

interface FloatingPromptProps {
  onClose: () => void;
  onSend: (command: string) => void;
  selectedText: string;
}

export default function FloatingPrompt({ onClose, onSend, selectedText }: FloatingPromptProps) {
  const [command, setCommand] = useState('');
  const [autocompleteVisible, setAutocompleteVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    // Show autocomplete on initial render if command is empty
    if (command === '') {
      setAutocompleteVisible(true);
    }
  }, []);

  const handleSend = () => {
    if (command.trim()) {
      onSend(command);
    }
  };
  
  const handleCommandChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCommand = e.target.value;
    setCommand(newCommand);
    // Hide autocomplete as soon as the user types
    setAutocompleteVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (autocompleteVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prevIndex) => (prevIndex + 1) % PRESET_PROMPTS.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prevIndex) => (prevIndex - 1 + PRESET_PROMPTS.length) % PRESET_PROMPTS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedPrompt = PRESET_PROMPTS[activeIndex];
        setCommand(selectedPrompt);
        setAutocompleteVisible(false);
        // We need to manually trigger onSend here if we want instant sending on selection.
        // Or, wait for a second Enter press. Let's wait.
      } else if (e.key === 'Escape') {
          setAutocompleteVisible(false);
      }
    } else {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
        }
    }
  };
  
  const selectAutocomplete = (suggestion: string) => {
      setCommand(suggestion);
      setAutocompleteVisible(false);
      textareaRef.current?.focus();
  }

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

      <div style={{ position: 'relative' }}>
        <textarea
            ref={textareaRef}
            value={command}
            onChange={handleCommandChange}
            onKeyDown={handleKeyDown}
            placeholder={PROMPT_PLACEHOLDER}
            style={{ width: '100%', padding: '8px', fontSize: '0.9rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'none', marginBottom: '12px' }}
            rows={2}
        />
        {autocompleteVisible && (
            <AutocompletePopup 
                suggestions={PRESET_PROMPTS}
                activeIndex={activeIndex}
                onSelect={selectAutocomplete}
                onHover={setActiveIndex}
            />
        )}
      </div>


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
