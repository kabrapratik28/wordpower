import React from 'react';

interface AutocompletePopupProps {
  suggestions: string[];
  activeIndex: number;
  onSelect: (suggestion: string) => void;
  onHover: (index: number) => void;
}

const popupStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  top: '100%', // Position it right below the parent (the textarea wrapper)
  left: 0,
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '0.375rem',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  zIndex: 10,
  marginTop: '4px',
  overflow: 'hidden',
};

const itemStyle: React.CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  color: '#374151',
};

const activeItemStyle: React.CSSProperties = {
  ...itemStyle,
  backgroundColor: '#f3f4f6',
};

export function AutocompletePopup({ suggestions, activeIndex, onSelect, onHover }: AutocompletePopupProps) {
  return (
    <div style={popupStyle}>
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion}
          style={index === activeIndex ? activeItemStyle : itemStyle}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onHover(index)}
        >
          {suggestion}
        </div>
      ))}
    </div>
  );
}
