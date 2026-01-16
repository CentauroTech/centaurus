import { useState, useRef, useEffect, useId } from 'react';
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
      className="fixed bg-popover text-popover-foreground rounded-lg shadow-lg border border-border py-1 max-h-60 overflow-y-auto"
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
            "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-accent transition-colors",
            value === option && "bg-accent"
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
        type="button"
      >
        <span className={cn("text-sm truncate flex-1 text-inherit", !value && "opacity-60")}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
      </button>
      {dropdown}
    </>
  );
}