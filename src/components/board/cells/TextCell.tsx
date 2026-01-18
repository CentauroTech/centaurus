import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TextCellProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TextCell({ value, onChange, placeholder = '-', disabled = false }: TextCellProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const initialValueRef = useRef(value || '');

  // Sync local value when external value changes (e.g., after bulk update)
  useEffect(() => {
    setLocalValue(value || '');
    initialValueRef.current = value || '';
  }, [value]);

  const handleFocus = () => {
    // Capture the initial value when focusing
    initialValueRef.current = localValue;
  };

  const handleBlur = () => {
    if (localValue !== initialValueRef.current) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(initialValueRef.current);
      e.currentTarget.blur();
    }
  };

  if (disabled) {
    return (
      <span className="w-full text-sm truncate text-inherit opacity-60 px-2.5 cursor-not-allowed">
        {value || placeholder}
      </span>
    );
  }

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-full bg-transparent border-0 outline-none text-sm focus:ring-0 truncate text-inherit placeholder:text-slate-400 px-2.5"
      placeholder={placeholder}
    />
  );
}
