import React, { useState, useRef, useEffect } from 'react';
import { icons, Wand, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Prompt } from '../../utils/constants';

const availableIconNames = Object.keys(icons);

interface IconPickerProps {
  value: Prompt['icon'];
  onChange: (iconName: Prompt['icon']) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const CurrentIconComponent = (icons as Record<string, LucideIcon>)[value] || Wand;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleIconSelect = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex items-center justify-between w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {CurrentIconComponent && <CurrentIconComponent size={18} className="mr-2" />}
        <span className="flex-grow text-left">{value}</span>
        <ChevronDown size={16} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto grid grid-cols-4 gap-1 p-1">
          {availableIconNames.map((iconName) => {
            const IconComponent = (icons as Record<string, LucideIcon>)[iconName];
            return (
              <button
                key={iconName}
                type="button"
                className={`flex items-center justify-center p-2 rounded-md hover:bg-gray-200 ${value === iconName ? 'bg-blue-100 text-blue-700' : ''}`}
                onClick={() => handleIconSelect(iconName)}
                title={iconName}
              >
                {IconComponent && <IconComponent size={20} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
