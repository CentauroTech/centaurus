import { Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PrivacyCellProps {
  isPrivate?: boolean;
  onChange: (isPrivate: boolean) => void;
}

export function PrivacyCell({ isPrivate = false, onChange }: PrivacyCellProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onChange(!isPrivate)}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-md transition-all",
              isPrivate
                ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {isPrivate ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isPrivate ? 'Private - Only assigned people can see this task' : 'Public - Visible to all team members'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}