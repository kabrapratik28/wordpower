import React, { createElement } from 'react';
import { PRESET_PROMPT_ICONS } from '../utils/constants';

interface AutocompletePopupProps {
  suggestions: string[];
  activeIndex: number;
  onSelect: (suggestion: string) => void;
  onHover: (index: number) => void;
}

const popupStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  top: '100%',
  left: 0,
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '0.5rem',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  zIndex: 10,
  marginTop: '4px',
  overflow: 'hidden',
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 12px',
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
      {suggestions.map((suggestion, index) => {
        const IconComponent = PRESET_PROMPT_ICONS[suggestion];
        return (
          <div
            key={suggestion}
            style={index === activeIndex ? activeItemStyle : itemStyle}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => onHover(index)}
          >
            {IconComponent && createElement(IconComponent, { size: 18, style: { marginRight: '10px', color: '#6b7280' } })}
            <span>{suggestion}</span>
          </div>
        );
      })}
    </div>
  );
}