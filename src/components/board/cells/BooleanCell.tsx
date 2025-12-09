import { Check, X } from 'lucide-react';
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
        "flex items-center justify-center w-6 h-6 rounded transition-smooth",
        value 
          ? "bg-status-done text-white" 
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {value ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    </button>
  );
}
