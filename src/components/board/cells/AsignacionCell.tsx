import { useState, useRef, useEffect, useId, memo } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const ASIGNACION_OPTIONS = [
  { value: 'On Hold', className: 'bg-gray-400 text-white' },
  { value: 'No Asignado', className: 'bg-red-500 text-white' },
  { value: 'Asignado', className: 'bg-purple-600 text-white' },
  { value: 'Not Needed', className: 'bg-purple-300 text-purple-800' },
  { value: 'Audio Description', className: 'bg-blue-500 text-white' },
];

interface AsignacionCellProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const AsignacionCell = memo(function AsignacionCell({ value, onChange, disabled = false }: AsignacionCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalId = useId();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current && !buttonRef.current.contains(target)) {
        if (dropdownRef.current && dropdownRef.current.contains(target)) return;
        setIsOpen(false);
      }
    };
    const handleScroll = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 160) });
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
      setPosition({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 160) });
    }
  }, [isOpen]);

  const currentOption = ASIGNACION_OPTIONS.find(o => o.value === value);
  const badgeClass = currentOption?.className || 'bg-muted text-muted-foreground';

  if (disabled) {
    return (
      <div className="h-full w-full">
        <span className={cn('h-full w-full px-2 py-1 text-xs font-medium text-center truncate block', badgeClass)}>
          {value || '-'}
        </span>
      </div>
    );
  }

  const dropdown = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      id={portalId}
      className="fixed bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-border py-1 max-h-60 overflow-y-auto"
      style={{ top: position.top, left: position.left, width: position.width, zIndex: 99999 }}
    >
      {ASIGNACION_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => { onChange(option.value); setIsOpen(false); }}
          className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', option.className)}>
            {option.value}
          </span>
          {value === option.value && <Check className="w-4 h-4 text-primary" />}
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
        className={cn(
          "h-full w-full px-2 py-1 text-xs font-medium transition-smooth text-center truncate",
          badgeClass
        )}
        type="button"
      >
        {value || '-'}
      </button>
      {dropdown}
    </>
  );
});
