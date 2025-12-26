import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft, X } from 'lucide-react';

interface FloatingPromptProps {
  onClose: () => void;
  onSend: (command: string) => void;
  position: { x: number; y: number };
  selectedText?: string;
}

function formatSelectedText(text: string, maxLength: number = 120): string {
  // Replace newlines with spaces and normalize whitespace
  let formatted = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (formatted.length <= maxLength) {
    return formatted;
  }
  
  // If overflow, show beginning + "..." + ending
  const ellipsis = '...';
  const ellipsisLength = ellipsis.length;
  const availableLength = maxLength - ellipsisLength;
  
  // Split available length roughly 60/40 between start and end
  const startLength = Math.floor(availableLength * 0.6);
  const endLength = availableLength - startLength;
  
  const startPart = formatted.substring(0, startLength).trim();
  const endPart = formatted.substring(formatted.length - endLength).trim();
  
  return `${startPart}${ellipsis}${endPart}`;
}

export default function FloatingPrompt({ onClose, onSend, position, selectedText }: FloatingPromptProps) {
  const [command, setCommand] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus textarea when component mounts
    textareaRef.current?.focus();
  }, []);

  // Debug: log selectedText to verify it's being passed
  useEffect(() => {
    if (selectedText) {
      console.log('Selected text received:', selectedText);
    }
  }, [selectedText]);

  const handleSend = () => {
    if (command.trim()) {
      onSend(command);
      setCommand('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[320px] max-w-[500px] z-[2147483647]"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Ask AI</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {selectedText ? (
        <div className="mb-3">
          <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-xs text-gray-600 font-mono truncate" title={selectedText}>
              {formatSelectedText(selectedText)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <div className="px-3 py-2 bg-red-50 rounded-md border border-red-200">
            <p className="text-xs text-red-600 font-medium">
              Please highlight/select text for improvement
            </p>
          </div>
        </div>
      )}

      <div className="mb-3">
        <textarea
          ref={textareaRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI to edit or generate..."
          className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={handleSend}
          disabled={!command.trim() || !selectedText || selectedText.trim() === ''}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-gray-200 bg-gray-900 text-white hover:bg-gray-800"
        >
          <span>Send</span>
          <CornerDownLeft 
            size={16} 
            className="text-current"
          />
        </button>
      </div>
    </div>
  );
}
