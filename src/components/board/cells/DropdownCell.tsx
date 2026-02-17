import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownCellProps {
  value?: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  isPrivate?: boolean;
  disabled?: boolean;
}

export function DropdownCell({ value, onChange, options, placeholder = 'Select...', isPrivate = false, disabled = false }: DropdownCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalId = useId();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current && !buttonRef.current.contains(target)) {
        if (dropdownRef.current && dropdownRef.current.contains(target)) {
          return;
        }
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen && buttonRef.current) {
        // Recalculate position on scroll
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 160),
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 160),
      });
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const safeOptions = options || [];

  const dropdown = isOpen && safeOptions.length > 0 ? createPortal(
    <div 
      ref={dropdownRef}
      id={portalId}
      className="fixed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg shadow-lg border border-border py-1 max-h-60 overflow-y-auto"
      style={{ 
        top: position.top, 
        left: position.left, 
        width: position.width,
        zIndex: 99999,
      }}
    >
      {safeOptions.map((option) => (
        <button
          key={option}
          onClick={() => handleSelect(option)}
          className={cn(
            "w-full px-3 py-2 text-left text-sm flex items-center justify-between text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
            value === option && "bg-slate-100 dark:bg-slate-800"
          )}
        >
          <span>{option}</span>
          {value === option && <Check className="w-4 h-4 text-primary" />}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  // Check if this is a Yes/No/Voice Bank style dropdown (badge style)
  const isBadgeStyle = options.includes('Yes') && options.includes('No');
  
  // Check if this is a Miami Studio dropdown
  const isStudioDropdown = options.some(opt => opt.startsWith('Studio '));

  const getBadgeClass = (val?: string) => {
    if (!val) return "bg-muted text-muted-foreground";
    if (val === 'Yes') return "bg-status-done text-white";
    if (val === 'No') return "bg-muted text-muted-foreground";
    // Voice Bank or other values
    return "bg-amber-500 text-white";
  };

  const getStudioBadgeClass = (val?: string) => {
    if (!val) return "bg-muted text-muted-foreground";
    if (val === 'Studio 1') return "bg-red-800 text-white";
    if (val === 'Studio 2') return "bg-blue-500 text-white";
    if (val === 'Studio 3') return "bg-orange-500 text-white";
    if (val === 'Studio 4') return "bg-purple-500 text-white";
    if (val === 'Studio 5') return "bg-teal-500 text-white";
    if (val === 'Studio 6') return "bg-pink-500 text-white";
    if (val === 'Studio 7') return "bg-amber-600 text-white";
    if (val === 'Studio 8') return "bg-cyan-600 text-white";
    return "bg-muted text-muted-foreground";
  };

  const shouldUseBadge = isBadgeStyle || isStudioDropdown;

  if (disabled) {
    return (
      <div className={cn(
        "flex items-center gap-1 text-left opacity-60 cursor-not-allowed",
        shouldUseBadge ? "justify-center" : "w-full"
      )}>
        {isBadgeStyle ? (
          <span className={cn(
            "px-3 py-1 rounded text-xs font-medium",
            getBadgeClass(value)
          )}>
            {value || 'No'}
          </span>
        ) : isStudioDropdown ? (
          <span className={cn(
            "px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap",
            getStudioBadgeClass(value)
          )}>
            {value || 'Select'}
          </span>
        ) : (
          <span className="text-sm truncate flex-1 text-inherit">
            {value || placeholder}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 text-left",
          shouldUseBadge ? "justify-center" : "w-full"
        )}
        type="button"
      >
        {isBadgeStyle ? (
          <span className={cn(
            "px-3 py-1 rounded text-xs font-medium transition-smooth",
            getBadgeClass(value)
          )}>
            {value || 'No'}
          </span>
        ) : isStudioDropdown ? (
          <span className={cn(
            "px-3 py-1 rounded-md text-xs font-medium transition-smooth whitespace-nowrap",
            getStudioBadgeClass(value)
          )}>
            {value || 'Select'}
          </span>
        ) : value && isPrivate ? (
          <span className="px-2 py-0.5 rounded text-xs font-medium truncate bg-white text-slate-800">
            {value}
          </span>
        ) : (
          <span className={cn("text-sm truncate flex-1 text-inherit", !value && "opacity-60")}>
            {value || placeholder}
          </span>
        )}
        {!shouldUseBadge && (
          <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
        )}
      </button>
      {dropdown}
    </>
  );
}