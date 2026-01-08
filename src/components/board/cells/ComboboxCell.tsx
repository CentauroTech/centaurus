import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComboboxCellProps {
  value?: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function ComboboxCell({ value, onChange, options, placeholder = 'Select...' }: ComboboxCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (inputValue !== value) {
          onChange(inputValue);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, onChange]);

  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(inputValue);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue !== value) {
              onChange(inputValue);
            }
          }}
          className="w-full bg-transparent border-0 outline-none text-sm text-foreground focus:ring-0 truncate"
          placeholder={placeholder}
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-0.5 hover:bg-muted rounded transition-smooth"
        >
          <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-[9999] mt-1 left-0 bg-card rounded-lg shadow-dropdown border border-border py-1 min-w-[160px] max-h-48 overflow-y-auto animate-fade-in">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted transition-smooth",
                  value === option && "bg-muted"
                )}
              >
                <span>{option}</span>
                {value === option && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))
          ) : (
            inputValue && (
              <button
                onClick={() => handleSelect(inputValue)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-smooth text-muted-foreground"
              >
                Add "{inputValue}"
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
