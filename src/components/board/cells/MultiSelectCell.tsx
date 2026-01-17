import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectCellProps {
  value?: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  isPrivate?: boolean;
}

// Memoized option button to prevent re-renders
const OptionButton = memo(function OptionButton({
  option,
  isSelected,
  onToggle,
}: {
  option: string;
  isSelected: boolean;
  onToggle: (option: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(option)}
      className={cn(
        "w-full px-3 py-2 text-left text-sm flex items-center justify-between text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800",
        isSelected && "bg-slate-100 dark:bg-slate-800"
      )}
    >
      <span>{option}</span>
      {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
    </button>
  );
});

export function MultiSelectCell({ 
  value = [], 
  onChange, 
  options, 
  placeholder = 'Select...', 
  isPrivate = false 
}: MultiSelectCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Memoize value set for O(1) lookup
  const valueSet = useMemo(() => new Set(value), [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = useCallback((option: string) => {
    onChange(
      valueSet.has(option)
        ? value.filter(v => v !== option)
        : [...value, option]
    );
  }, [value, valueSet, onChange]);

  const handleRemove = useCallback((option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== option));
  }, [value, onChange]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Memoize selected badges
  const selectedBadges = useMemo(() => (
    value.map((item) => (
      <span
        key={item}
        className={cn(
          "inline-flex items-center gap-0.5 px-1 py-0 text-[10px] rounded whitespace-nowrap font-medium leading-tight",
          isPrivate 
            ? "bg-white text-slate-800 border border-slate-200" 
            : "bg-amber-100 text-amber-800 border border-amber-300"
        )}
      >
        <span>{item}</span>
        <button
          onClick={(e) => handleRemove(item, e)}
          className={cn(
            "rounded p-0 flex-shrink-0",
            isPrivate ? "hover:bg-slate-200 text-slate-600" : "hover:bg-amber-200 text-amber-700"
          )}
        >
          <X className="w-2 h-2" />
        </button>
      </span>
    ))
  ), [value, isPrivate, handleRemove]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="flex items-center gap-0.5 w-full text-left min-h-[20px]"
      >
        {value.length > 0 ? (
          <div className="flex flex-nowrap gap-0.5 flex-1 min-w-0 overflow-hidden">
            {selectedBadges}
          </div>
        ) : (
          <span className="text-xs truncate flex-1 text-inherit opacity-60">
            {placeholder}
          </span>
        )}
        <ChevronDown className={cn(
          "w-2.5 h-2.5 flex-shrink-0 text-inherit opacity-60",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] mt-1 left-0 bg-white dark:bg-slate-900 rounded-lg shadow-dropdown border border-border py-1 min-w-[220px] max-h-64 overflow-y-auto">
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
            <OptionButton
              key={option}
              option={option}
              isSelected={valueSet.has(option)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
