import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Status, STATUS_CONFIG } from '@/types/board';

interface StatusBadgeProps {
  status: Status;
  onStatusChange: (status: Status) => void;
}

export function StatusBadge({ status, onStatusChange }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const config = STATUS_CONFIG[status];

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
          {(Object.keys(STATUS_CONFIG) as Status[]).map((statusKey) => (
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
                  STATUS_CONFIG[statusKey].className
                )}
              >
                {STATUS_CONFIG[statusKey].label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
