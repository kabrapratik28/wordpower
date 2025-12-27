import React, { createElement, useRef, useEffect } from 'react';
import * as icons from 'lucide-react';
import { useTheme } from '../utils/useTheme';
import type { Prompt } from '../utils/constants';

interface AutocompletePopupProps {
  suggestions: Prompt[];
  activeIndex: number;
  onSelect: (suggestion: Prompt) => void;
  onHover: (index: number) => void;
}

export function AutocompletePopup({ suggestions, activeIndex, onSelect, onHover }: AutocompletePopupProps) {
    const theme = useTheme();
    const scrollContainerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable container

    // Effect to scroll active item into view
    useEffect(() => {
        if (scrollContainerRef.current && activeIndex !== -1) {
            const activeItem = scrollContainerRef.current.children[activeIndex] as HTMLElement;
            if (activeItem) {
                const container = scrollContainerRef.current;
                const { offsetTop, offsetHeight } = activeItem;
                const { scrollTop, clientHeight } = container;

                // If item is above the current view
                if (offsetTop < scrollTop) {
                    container.scrollTop = offsetTop;
                }
                // If item is below the current view
                else if (offsetTop + offsetHeight > scrollTop + clientHeight) {
                    container.scrollTop = offsetTop + offsetHeight - clientHeight;
                }
            }
        }
    }, [activeIndex, suggestions]); // Re-run if activeIndex or suggestions change

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

    const handleSettingsClick = (e: React.MouseEvent) => {
        console.log('Settings click handler fired');
        e.preventDefault();
        e.stopPropagation();
        browser.runtime.sendMessage({ type: 'openSettingsPage' });
    }

    const onSelectWrapper = (suggestion: Prompt) => {
        console.log('Suggestion selected:', suggestion.name);
        onSelect(suggestion);
    }

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
        display: 'flex',
        flexDirection: 'column',
    };

    const getItemStyle = (index: number): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        color: currentColors.text,
        backgroundColor: index === activeIndex ? currentColors.hoverBg : 'transparent',
        flexShrink: 0,
    });

  return (
    <div style={popupStyle}>
      <div style={{ overflowY: 'auto', maxHeight: '250px' /* Approx 5 items */ }} ref={scrollContainerRef}>
        {suggestions.map((suggestion, index) => {
          const IconComponent = icons[suggestion.icon] || icons.Wand;
          return (
            <div
              key={suggestion.id}
              style={getItemStyle(index)}
              onMouseDown={() => onSelectWrapper(suggestion)}
              onMouseEnter={() => onHover(index)}
            >
              <IconComponent size={18} style={{ marginRight: '10px', color: currentColors.icon, flexShrink: 0 }} />
              <span>{suggestion.name}</span>
            </div>
          );
        })}
      </div>
      <div 
        style={{
            ...getItemStyle(-1), // Use same base style, but without hover effect
            borderTop: `1px solid ${currentColors.border}`,
        }}
        onMouseDown={handleSettingsClick}
        >
            <icons.Settings size={18} style={{ marginRight: '10px', color: currentColors.icon, flexShrink: 0 }} />
            <span>Manage Prompts</span>
      </div>
    </div>
  );
}
