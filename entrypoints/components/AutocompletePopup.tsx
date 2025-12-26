import React, { createElement } from 'react';
import { PRESET_PROMPT_ICONS } from '../utils/constants';
import { useTheme } from '../utils/useTheme';

interface AutocompletePopupProps {
  suggestions: string[];
  activeIndex: number;
  onSelect: (suggestion: string) => void;
  onHover: (index: number) => void;
}

export function AutocompletePopup({ suggestions, activeIndex, onSelect, onHover }: AutocompletePopupProps) {
    const theme = useTheme();

    const colors = {
        light: {
            bg: 'white',
            border: '#e2e8f0',
            text: '#374151',
            hoverBg: '#f3f4f6',
            icon: '#6b7280',
        },
        dark: {
            bg: '#1f2937', // gray-800
            border: '#4b5563', // gray-600
            text: '#d1d5db', // gray-300
            hoverBg: '#374151', // gray-700
            icon: '#9ca3af', // gray-400
        }
    };
    const currentColors = colors[theme];

    const popupStyle: React.CSSProperties = {
        position: 'absolute',
        width: '100%',
        top: '100%',
        left: 0,
        backgroundColor: currentColors.bg,
        border: `1px solid ${currentColors.border}`,
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        zIndex: 10,
        marginTop: '4px',
        overflow: 'hidden',
    };

    const getItemStyle = (index: number): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        color: currentColors.text,
        backgroundColor: index === activeIndex ? currentColors.hoverBg : 'transparent',
    });

  return (
    <div style={popupStyle}>
      {suggestions.map((suggestion, index) => {
        const IconComponent = PRESET_PROMPT_ICONS[suggestion];
        return (
          <div
            key={suggestion}
            style={getItemStyle(index)}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => onHover(index)}
          >
            {IconComponent && createElement(IconComponent, { size: 18, style: { marginRight: '10px', color: currentColors.icon } })}
            <span>{suggestion}</span>
          </div>
        );
      })}
    </div>
  );
}
