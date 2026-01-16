import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectCellProps {
  value?: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  isPrivate?: boolean;
}

export function MultiSelectCell({ value = [], onChange, options, placeholder = 'Select...', isPrivate = false }: MultiSelectCellProps) {
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
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded whitespace-nowrap font-medium",
                  isPrivate 
                    ? "bg-white text-slate-800 border border-slate-200" 
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                )}
              >
                <span>{item}</span>
                <button
                  onClick={(e) => handleRemove(item, e)}
                  className={cn(
                    "rounded p-0.5 flex-shrink-0",
                    isPrivate ? "hover:bg-slate-200 text-slate-600" : "hover:bg-amber-200 text-amber-700"
                  )}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm truncate flex-1 text-inherit opacity-60">
            {placeholder}
          </span>
        )}
        <ChevronDown className={cn(
          "w-3 h-3 transition-transform flex-shrink-0 text-inherit opacity-60",
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
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap"
                  >
                    <span>{item}</span>
                    <button
                      onClick={(e) => handleRemove(item, e)}
                      className="hover:bg-blue-200 rounded-full p-0.5"
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
              <span>{option}</span>
              {value.includes(option) && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
