import { useState, useEffect, useRef } from 'react';

interface NumberCellProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  displayFormat?: 'episodes';
  episodeIndex?: number;
}

export function NumberCell({ value, onChange, placeholder = '-', disabled = false, displayFormat, episodeIndex }: NumberCellProps) {
  const [localValue, setLocalValue] = useState(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);
  const initialValueRef = useRef(value);

  useEffect(() => {
    setLocalValue(value?.toString() || '');
    initialValueRef.current = value;
  }, [value]);

  const formatDisplay = (v?: number) => {
    if (v == null) return placeholder;
    if (displayFormat === 'episodes') {
      const idx = episodeIndex ?? 1;
      return `${idx}/${v}`;
    }
    return v;
  };

  const handleFocus = () => {
    initialValueRef.current = localValue ? parseFloat(localValue) : undefined;
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
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
        {formatDisplay(value)}
      </span>
    );
  }

  // Show formatted display when not focused and has a display format
  if (!isFocused && displayFormat && value != null) {
    return (
      <span
        className="w-full text-sm text-inherit cursor-text"
        onClick={(e) => {
          const input = e.currentTarget.nextElementSibling as HTMLInputElement;
          input?.focus();
        }}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
      >
        {formatDisplay(value)}
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
      autoFocus={isFocused && displayFormat != null}
      className="w-full bg-transparent border-0 outline-none text-sm focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-inherit placeholder:text-muted-foreground"
      placeholder={placeholder}
    />
  );
}