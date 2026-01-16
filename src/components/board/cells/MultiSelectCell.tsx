import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectCellProps {
  value?: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
}

export function MultiSelectCell({ value = [], onChange, options, placeholder = 'Select...' }: MultiSelectCellProps) {
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

  const handleToggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const handleRemove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== option));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 w-full text-left min-h-[28px]"
      >
        {value.length > 0 ? (
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {value.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded"
              >
                <span className="truncate max-w-[80px]">{item}</span>
                <button
                  onClick={(e) => handleRemove(item, e)}
                  className="hover:bg-primary/20 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground truncate flex-1">
            {placeholder}
          </span>
        )}
        <ChevronDown className={cn(
          "w-3 h-3 text-muted-foreground transition-transform flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] mt-1 left-0 bg-card rounded-lg shadow-dropdown border border-border py-1 min-w-[220px] max-h-64 overflow-y-auto animate-fade-in">
          {value.length > 0 && (
            <div className="px-3 py-2 border-b border-border">
              <div className="flex flex-wrap gap-1">
                {value.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                  >
                    <span className="truncate max-w-[120px]">{item}</span>
                    <button
                      onClick={(e) => handleRemove(item, e)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleToggle(option)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted transition-smooth",
                value.includes(option) && "bg-muted"
              )}
            >
              <span className="truncate">{option}</span>
              {value.includes(option) && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
