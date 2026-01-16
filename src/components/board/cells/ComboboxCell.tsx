import { useState, useRef, useEffect, useId } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalId = useId();

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        if (dropdownRef.current && dropdownRef.current.contains(target)) {
          return;
        }
        setIsOpen(false);
        if (inputValue !== value) {
          onChange(inputValue);
        }
      }
    };

    const handleScroll = () => {
      if (isOpen && containerRef.current) {
        // Recalculate position on scroll
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 200),
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [inputValue, value, onChange, isOpen]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    }
  }, [isOpen]);

  const filteredOptions = options?.filter(option => 
    option.toLowerCase().includes(inputValue.toLowerCase())
  ) || [];

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
      ref={dropdownRef}
      id={portalId}
      className="fixed bg-popover text-popover-foreground rounded-lg shadow-lg border border-border py-1 max-h-60 overflow-y-auto"
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
              "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-accent transition-colors",
              value === option && "bg-accent"
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
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors text-muted-foreground"
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
          className="w-full bg-transparent border-0 outline-none text-sm text-foreground focus:ring-0 truncate"
          placeholder={placeholder}
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-0.5 hover:bg-muted rounded transition-colors"
          type="button"
        >
          <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>
      {dropdown}
    </>
  );
}