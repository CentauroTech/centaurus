import { Copy, Trash2, MoveRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTaskSelection } from '@/contexts/TaskSelectionContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionsToolbarProps {
  onDuplicate: (taskIds: string[]) => void;
  onDelete: (taskIds: string[]) => void;
  onMoveToPhase: (taskIds: string[], phase: string) => void;
  availablePhases: string[];
}

export function BulkActionsToolbar({
  onDuplicate,
  onDelete,
  onMoveToPhase,
  availablePhases,
}: BulkActionsToolbarProps) {
  const { selectedTaskIds, clearSelection, isSelecting } = useTaskSelection();

  if (!isSelecting) return null;

  const taskIds = Array.from(selectedTaskIds);
  const count = taskIds.length;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-3 bg-card border border-border rounded-lg shadow-lg px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {count} {count === 1 ? 'item' : 'items'} selected
        </span>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => {
            onDuplicate(taskIds);
            clearSelection();
          }}
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <MoveRight className="w-4 h-4" />
              Move to
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[160px]">
            {availablePhases.map((phase) => (
              <DropdownMenuItem
                key={phase}
                onClick={() => {
                  onMoveToPhase(taskIds, phase);
                  clearSelection();
                }}
              >
                {phase}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={() => {
            onDelete(taskIds);
            clearSelection();
          }}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={clearSelection}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
