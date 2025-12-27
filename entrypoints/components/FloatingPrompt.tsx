import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft, X } from 'lucide-react';
import { PROMPT_PLACEHOLDER, DEFAULT_PROMPTS, type Prompt } from '../utils/constants';
import { AutocompletePopup } from './AutocompletePopup';
import { useTheme } from '../utils/useTheme';

import { getPrompts } from '../utils/prompts';

interface FloatingPromptProps {
  onClose: () => void;
  onSend: (command: string) => void;
  selectedText: string;
}

export default function FloatingPrompt({ onClose, onSend, selectedText }: FloatingPromptProps) {
  const [command, setCommand] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [autocompleteVisible, setAutocompleteVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = useTheme();

  useEffect(() => {
    // Load prompts from storage when component mounts
    getPrompts().then(setPrompts);

    textareaRef.current?.focus();
    if (command === '') setAutocompleteVisible(true);

    // Listen for updates from the settings page
    const handleMessage = (message: any) => {
        if (message.type === 'promptsUpdated') {
            getPrompts().then(setPrompts);
        }
    };
    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleSend = () => {
    if (command.trim()) {
      const matchingPrompt = prompts.find(p => p.name === command.trim());
      onSend(matchingPrompt ? matchingPrompt.value : command);
    }
  };
  
  const handleCommandChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommand(e.target.value);
    setAutocompleteVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (autocompleteVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % prompts.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + prompts.length) % prompts.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setCommand(prompts[activeIndex].name);
        setAutocompleteVisible(false);
      } else if (e.key === 'Escape') {
        setAutocompleteVisible(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };
  
  const selectAutocomplete = (suggestion: Prompt) => {
    setCommand(suggestion.name);
    setAutocompleteVisible(false);
    textareaRef.current?.focus();
  }
  
  const colors = {
      light: {
        cardBg: 'white',
        text: '#111827',
        subtext: '#4b5563',
        border: '#e5e7eb',
        selectedBg: '#f9fafb',
        buttonText: 'white',
        buttonBg: '#111827',
      },
      dark: {
        cardBg: '#1f2937', // gray-800
        text: '#f9fafb', // gray-50
        subtext: '#9ca3af', // gray-400
        border: '#4b5563', // gray-600
        selectedBg: '#374151', // gray-700
        buttonText: '#1f2937', // gray-800
        buttonBg: '#d1d5db', // gray-300
      }
  };
  const currentColors = colors[theme];

  const wordLimit = 1000;
  const wordCount = selectedText.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount > wordLimit) {
    return (
        <div
          className="wordpower-card"
          style={{ 
              backgroundColor: currentColors.cardBg, 
              borderColor: currentColors.border,
              color: currentColors.text
            }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#ef4444' }}>Word Limit Exceeded</h3>
            <button
              onClick={onClose}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: currentColors.subtext }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
    
          <div style={{ padding: '8px', backgroundColor: currentColors.selectedBg, borderRadius: '0.375rem', border: `1px solid ${currentColors.border}` }}>
            <p style={{ fontSize: '0.9rem', color: currentColors.text }}>
              The selected text has {wordCount} words, which exceeds the {wordLimit}-word limit. Please select a shorter piece of text.
            </p>
          </div>
        </div>
      );
  }

  return (
    <div
      className="wordpower-card"
      style={{ 
          backgroundColor: currentColors.cardBg, 
          borderColor: currentColors.border,
          color: currentColors.text
        }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 500, color: currentColors.text }}>Improve Selection</h3>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: currentColors.subtext }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: currentColors.selectedBg, borderRadius: '0.375rem', border: `1px solid ${currentColors.border}` }}>
        <p style={{ fontSize: '0.8rem', color: currentColors.subtext, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={selectedText}>
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
            style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '0.9rem', 
                border: `1px solid ${currentColors.border}`, 
                borderRadius: '0.375rem', 
                resize: 'none', 
                marginBottom: '12px',
                backgroundColor: currentColors.selectedBg,
                color: currentColors.text,
            }}
            rows={2}
        />
        {autocompleteVisible && (
            <AutocompletePopup 
                suggestions={prompts}
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
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', fontSize: '0.9rem', fontWeight: 500, borderRadius: '0.375rem', border: 'none', cursor: 'pointer', backgroundColor: currentColors.buttonBg, color: currentColors.buttonText, opacity: !command.trim() ? 0.6 : 1 }}
        >
          <span>Send</span>
          <CornerDownLeft size={16} />
        </button>
      </div>
    </div>
  );
}