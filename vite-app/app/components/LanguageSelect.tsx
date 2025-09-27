import React, { useState, useRef, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, getLanguageByCode, type Language } from '../constants/languages';

interface LanguageSelectProps {
  value: string;
  onChange: (languageCode: string) => void;
  className?: string;
}

export function LanguageSelect({ value, onChange, className = '' }: LanguageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedLanguage = getLanguageByCode(value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = (language: Language) => {
    onChange(language.code);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-sm text-left flex items-center justify-between"
      >
        <span>
          {selectedLanguage 
            ? `${selectedLanguage.name} ${selectedLanguage.nativeName !== selectedLanguage.name ? `(${selectedLanguage.nativeName})` : ''}`
            : 'Select language...'
          }
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => handleLanguageSelect(language)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                language.code === value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
              }`}
            >
              <div>
                <span className="font-medium">{language.name}</span>
                {language.nativeName !== language.name && (
                  <span className="ml-2 text-gray-600">({language.nativeName})</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}