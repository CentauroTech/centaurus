import { useState } from 'react';
import { Check, ChevronDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type GuestStatus = 'default' | 'working' | 'done';

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

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={isDisabled}>
        <button
          className={cn(
            "flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-sm font-medium min-w-[130px]",
            "transition-all duration-200",
            isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:opacity-90",
            isDelayed ? "bg-red-500 text-white" : config.className
          )}
        >
          <span className="flex items-center gap-1.5">
            {isDelayed && <AlertTriangle className="w-3.5 h-3.5" />}
            {isDelayed ? 'Delayed' : config.label}
          </span>
          {!isDisabled && <ChevronDown className="w-3.5 h-3.5" />}
          {normalizedStatus === 'done' && <Check className="w-3.5 h-3.5" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[180px]">
        <DropdownMenuItem
          onClick={() => {
            onChange('default');
            setIsOpen(false);
          }}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            normalizedStatus === 'default' && "bg-accent"
          )}
        >
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span>Not Started</span>
          {normalizedStatus === 'default' && <Check className="w-4 h-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onChange('working');
            setIsOpen(false);
          }}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            normalizedStatus === 'working' && "bg-accent"
          )}
        >
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Working on it</span>
          {normalizedStatus === 'working' && <Check className="w-4 h-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            onChange('done');
            setIsOpen(false);
          }}
          className="flex items-center gap-2 cursor-pointer text-green-600 font-medium"
        >
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Mark as Done</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
