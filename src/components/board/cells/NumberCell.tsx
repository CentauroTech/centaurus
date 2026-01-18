import { useState, useEffect, useRef } from 'react';

interface NumberCellProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function NumberCell({ value, onChange, placeholder = '-', disabled = false }: NumberCellProps) {
  const [localValue, setLocalValue] = useState(value?.toString() || '');
  const initialValueRef = useRef(value);

  // Sync local value when external value changes (e.g., after bulk update)
  useEffect(() => {
    setLocalValue(value?.toString() || '');
    initialValueRef.current = value;
  }, [value]);

  const handleFocus = () => {
    // Capture the initial value when focusing
    initialValueRef.current = localValue ? parseFloat(localValue) : undefined;
  };

  const handleBlur = () => {
    const numValue = localValue ? parseFloat(localValue) : undefined;
    if (numValue !== initialValueRef.current) {
      onChange(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(initialValueRef.current?.toString() || '');
      e.currentTarget.blur();
    }
  };

  if (disabled) {
    return (
      <span className="w-full text-sm text-inherit opacity-60 cursor-not-allowed">
        {value ?? placeholder}
      </span>
    );
  }

  return (
    <input
      type="number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-full bg-transparent border-0 outline-none text-sm focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-inherit placeholder:text-slate-400"
      placeholder={placeholder}
    />
  );
}
