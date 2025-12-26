import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

interface FloatingPromptProps {
  onClose: () => void;
  onSend: (command: string) => void;
  position: { x: number; y: number };
}

export default function FloatingPrompt({ onClose, onSend, position }: FloatingPromptProps) {
  const [command, setCommand] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus textarea when component mounts
    textareaRef.current?.focus();
  }, []);

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
          disabled={!command.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
        >
          <Send 
            size={16} 
            strokeWidth={0}
            fill="currentColor"
            className={command.trim() ? 'text-white' : 'text-gray-500'} 
          />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
