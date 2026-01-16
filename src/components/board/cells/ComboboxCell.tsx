import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Check if click is inside the portal dropdown
        const dropdown = document.getElementById('combobox-portal');
        if (dropdown && dropdown.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
        if (inputValue !== value) {
          onChange(inputValue);
        }
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
        if (inputValue !== value) {
          onChange(inputValue);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [inputValue, value, onChange, isOpen]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 180),
      });
    }
  }, [isOpen]);

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

  const dropdown = isOpen ? createPortal(
    <div 
      id="combobox-portal"
      className="fixed bg-card rounded-lg shadow-lg border border-border py-1 max-h-48 overflow-y-auto animate-fade-in"
      style={{ 
        top: position.top, 
        left: position.left, 
        width: position.width,
        zIndex: 99999,
      }}
    >
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
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="flex items-center gap-1" ref={containerRef}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay blur to allow click on dropdown
            setTimeout(() => {
              if (inputValue !== value) {
                onChange(inputValue);
              }
            }, 150);
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
      {dropdown}
    </>
  );
}