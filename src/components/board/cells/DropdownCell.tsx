import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownCellProps {
  value?: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function DropdownCell({ value, onChange, options, placeholder = 'Select...' }: DropdownCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownId = useRef(`dropdown-${Math.random().toString(36).substr(2, 9)}`);
  
  console.log('DropdownCell render:', { value, options, optionsLength: options?.length, isOpen });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // Check if click is inside the portal dropdown
        const dropdown = document.getElementById(dropdownId.current);
        if (dropdown && dropdown.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 160),
      });
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const dropdown = isOpen && options && options.length > 0 ? createPortal(
    <div 
      id={dropdownId.current}
      className="fixed bg-card rounded-lg shadow-lg border border-border py-1 max-h-48 overflow-y-auto animate-fade-in"
      style={{ 
        top: position.top, 
        left: position.left, 
        width: position.width,
        zIndex: 99999,
      }}
    >
      {options.map((option) => (
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
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 w-full text-left"
      >
        <span className={cn("text-sm truncate flex-1", value ? "text-foreground" : "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform flex-shrink-0", isOpen && "rotate-180")} />
      </button>
      {dropdown}
    </>
  );
}