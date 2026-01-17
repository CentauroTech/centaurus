import { useState } from 'react';
import { Check, ChevronDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type GuestStatus = 'default' | 'working' | 'done';

interface GuestStatusBadgeProps {
  status: string;
  guestDueDate?: string;
  onChange: (status: GuestStatus) => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<GuestStatus, { label: string; className: string }> = {
  default: { label: 'Not Started', className: 'bg-gray-500 text-white' },
  working: { label: 'Working on it', className: 'bg-amber-500 text-white' },
  done: { label: 'Done', className: 'bg-green-500 text-white' },
};

export function GuestStatusBadge({ 
  status, 
  guestDueDate, 
  onChange,
  disabled = false,
}: GuestStatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Normalize status to one of the allowed guest statuses
  const normalizedStatus: GuestStatus = 
    status === 'done' ? 'done' : 
    status === 'working' ? 'working' : 'default';

  // Check if delayed (past due date and not done)
  const isDelayed = guestDueDate && 
    normalizedStatus !== 'done' && 
    new Date(guestDueDate) < new Date();

  const config = STATUS_CONFIG[normalizedStatus];

  // If status is done, disable dropdown
  const isDisabled = disabled || normalizedStatus === 'done';

  // Available statuses for dropdown (exclude 'done' - requires validation)
  const availableStatuses: GuestStatus[] = ['default', 'working'];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={isDisabled}>
        <button
          className={cn(
            "flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-sm font-medium min-w-[130px]",
            "transition-all duration-200",
            isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:opacity-90",
            isDelayed && normalizedStatus !== 'done' 
              ? "bg-red-500 text-white" 
              : config.className
          )}
        >
          <span className="flex items-center gap-1.5">
            {isDelayed && normalizedStatus !== 'done' && (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {isDelayed && normalizedStatus !== 'done' ? 'Delayed' : config.label}
          </span>
          {!isDisabled && <ChevronDown className="w-3.5 h-3.5" />}
          {normalizedStatus === 'done' && <Check className="w-3.5 h-3.5" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[180px]">
        {availableStatuses.map((statusKey) => {
          const statusConfig = STATUS_CONFIG[statusKey];
          return (
            <DropdownMenuItem
              key={statusKey}
              onClick={() => {
                onChange(statusKey);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                normalizedStatus === statusKey && "bg-accent"
              )}
            >
              <div className={cn("w-3 h-3 rounded-full", statusConfig.className)} />
              <span>{statusConfig.label}</span>
              {normalizedStatus === statusKey && <Check className="w-4 h-4 ml-auto" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
