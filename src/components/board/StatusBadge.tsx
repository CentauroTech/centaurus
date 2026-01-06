import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Status, STATUS_CONFIG } from '@/types/board';

interface StatusBadgeProps {
  status: Status;
  onStatusChange: (status: Status) => void;
  isKickoffPhase?: boolean;
}

export function StatusBadge({ status, onStatusChange, isKickoffPhase = false }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // In Kickoff phase, show "Launch" instead of "Done"
  const getDisplayConfig = (statusKey: Status) => {
    if (isKickoffPhase && statusKey === 'done') {
      return { label: 'Launch', className: STATUS_CONFIG.done.className };
    }
    // Don't show 'launch' status in non-kickoff phases
    if (!isKickoffPhase && statusKey === 'launch') {
      return null;
    }
    return STATUS_CONFIG[statusKey];
  };

  const config = getDisplayConfig(status) || STATUS_CONFIG[status];

  // Filter out statuses based on phase context
  const availableStatuses = (Object.keys(STATUS_CONFIG) as Status[]).filter(statusKey => {
    // In Kickoff phase, show 'done' (which displays as 'Launch') but hide 'launch'
    if (isKickoffPhase && statusKey === 'launch') return false;
    // In non-Kickoff phases, hide 'launch' status
    if (!isKickoffPhase && statusKey === 'launch') return false;
    return true;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-3 py-1.5 rounded text-xs font-medium min-w-[100px] text-center transition-smooth",
          "flex items-center justify-center gap-1",
          config.className,
          "hover:opacity-90"
        )}
      >
        <span>{config.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 left-0 bg-card rounded-lg shadow-dropdown border border-border py-1 min-w-[140px] animate-fade-in">
          {availableStatuses.map((statusKey) => {
            const displayConfig = getDisplayConfig(statusKey);
            if (!displayConfig) return null;
            
            return (
              <button
                key={statusKey}
                onClick={() => {
                  onStatusChange(statusKey);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-smooth",
                  status === statusKey && "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded text-xs font-medium",
                    displayConfig.className
                  )}
                >
                  {displayConfig.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
