import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Status, STATUS_CONFIG } from '@/types/board';
import { AVAILABLE_PHASES } from '@/hooks/useBulkTaskActions';

interface StatusBadgeProps {
  status: Status;
  onStatusChange: (status: Status) => void;
  isKickoffPhase?: boolean;
  onSendToPhase?: (phase: string) => void;
}

export function StatusBadge({ status, onStatusChange, isKickoffPhase = false, onSendToPhase }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPhaseMenu, setShowPhaseMenu] = useState(false);
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

  const config = getDisplayConfig(status) || STATUS_CONFIG[status] || STATUS_CONFIG.default;

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
        setShowPhaseMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative h-full w-full flex items-center justify-center px-1.5 py-1" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-3 py-1 rounded-md text-xs font-medium text-center transition-smooth",
          "flex items-center justify-center gap-1",
          config.className,
          "hover:opacity-90"
        )}
      >
        <span className="truncate">{config.label}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] mt-1 left-0 bg-card rounded-lg shadow-dropdown border border-border py-1 min-w-[160px] animate-fade-in">
          {/* Status options */}
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

          {/* Separator */}
          {onSendToPhase && (
            <>
              <div className="h-px bg-border my-1" />
              
              {/* Send to phase button */}
              <div className="relative">
                <button
                  onClick={() => setShowPhaseMenu(!showPhaseMenu)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-smooth flex items-center gap-2"
                >
                  <Send className="w-3 h-3 text-primary" />
                  <span className="text-primary font-medium">Send to...</span>
                  <ChevronDown className="w-3 h-3 ml-auto" />
                </button>

                {showPhaseMenu && (
                  <div className="absolute left-full top-0 ml-1 bg-card rounded-lg shadow-dropdown border border-border py-1 min-w-[140px] max-h-[300px] overflow-y-auto animate-fade-in z-[10000]">
                    {AVAILABLE_PHASES.map((phase) => (
                      <button
                        key={phase}
                        onClick={() => {
                          onSendToPhase(phase);
                          setIsOpen(false);
                          setShowPhaseMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-smooth whitespace-nowrap"
                      >
                        {phase}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
