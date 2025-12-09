import { useState } from 'react';

interface NumberCellProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}

export function NumberCell({ value, onChange, placeholder = '-' }: NumberCellProps) {
  const [localValue, setLocalValue] = useState(value?.toString() || '');

  const handleBlur = () => {
    const numValue = localValue ? parseFloat(localValue) : undefined;
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  return (
    <input
      type="number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className="w-full bg-transparent border-0 outline-none text-sm text-foreground focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      placeholder={placeholder}
    />
  );
}
