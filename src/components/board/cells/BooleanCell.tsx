import { cn } from '@/lib/utils';

interface BooleanCellProps {
  value?: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function BooleanCell({ value, onChange, disabled = false }: BooleanCellProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={cn(
        "px-3 py-1 rounded text-xs font-medium transition-smooth",
        value 
          ? "bg-status-done text-white" 
          : "bg-muted text-muted-foreground hover:bg-muted/80",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      {value ? 'Yes' : 'No'}
    </button>
  );
}
