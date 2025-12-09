import { useState } from 'react';

interface TextCellProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextCell({ value, onChange, placeholder = '-' }: TextCellProps) {
  const [localValue, setLocalValue] = useState(value || '');

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className="w-full bg-transparent border-0 outline-none text-sm text-foreground focus:ring-0 truncate"
      placeholder={placeholder}
    />
  );
}
