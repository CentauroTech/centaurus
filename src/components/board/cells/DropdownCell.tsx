import { useState, useRef, useEffect } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 w-full text-left"
      >
        <span className={cn("text-sm truncate flex-1", value ? "text-foreground" : "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform flex-shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 left-0 bg-card rounded-lg shadow-dropdown border border-border py-1 min-w-[120px] max-h-48 overflow-y-auto animate-fade-in">
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
        </div>
      )}
    </div>
  );
}
