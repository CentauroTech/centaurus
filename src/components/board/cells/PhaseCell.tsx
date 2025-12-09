import { useState } from 'react';
import { Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Phase, PHASE_CONFIG } from '@/types/board';
import { cn } from '@/lib/utils';

interface PhaseCellProps {
  phase?: Phase;
  onPhaseChange: (phase: Phase) => void;
}

export function PhaseCell({ phase, onPhaseChange }: PhaseCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const config = phase ? PHASE_CONFIG[phase] : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "px-2 py-1 rounded text-xs font-medium transition-smooth w-full text-center truncate",
            config?.className || "bg-muted text-muted-foreground"
          )}
        >
          {config?.label || 'Select phase'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <div className="space-y-0.5">
          {(Object.keys(PHASE_CONFIG) as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                onPhaseChange(p);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-smooth",
                PHASE_CONFIG[p].className
              )}
            >
              <span className="flex-1">{PHASE_CONFIG[p].label}</span>
              {phase === p && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
