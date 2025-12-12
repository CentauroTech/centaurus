import { cn } from '@/lib/utils';

interface BooleanCellProps {
  value?: boolean;
  onChange: (value: boolean) => void;
}

export function BooleanCell({ value, onChange }: BooleanCellProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "px-3 py-1 rounded text-xs font-medium transition-smooth",
        value 
          ? "bg-status-done text-white" 
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {value ? 'Yes' : 'No'}
    </button>
  );
}
