import { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from '@/types/board';
import { useTeamMembers } from '@/hooks/useWorkspaces';
import { useTeamMemberRolesMap, RoleType } from '@/hooks/useTeamMemberRoles';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface RoleBasedOwnerCellProps {
  owner?: User;
  onOwnerChange: (owner: User | undefined) => void;
  roleFilter?: RoleType;
  disabled?: boolean;
  onInstructionsComment?: (comment: string, viewerIds: string[]) => void;
  taskId?: string;
}

export function RoleBasedOwnerCell({ owner, onOwnerChange, roleFilter, disabled = false, onInstructionsComment, taskId }: RoleBasedOwnerCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [instructions, setInstructions] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: teamMembers = [] } = useTeamMembers();
  const rolesMap = useTeamMemberRolesMap();

  // Map team members to User format, filtering by role if specified
  const users: User[] = teamMembers
    .filter(m => {
      if (!roleFilter) return true;
      const memberRoles = rolesMap.get(m.id) || [];
      return memberRoles.includes(roleFilter);
    })
    .map(m => ({
      id: m.id,
      name: m.name,
      initials: m.initials,
      color: m.color,
    }));

  // Check if a team member is a guest (non-@centauro.com email)
  const isGuestMember = (userId: string): boolean => {
    const member = teamMembers.find(m => m.id === userId);
    if (!member) return false;
    return !member.email || !member.email.toLowerCase().includes('@centauro.com');
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectUser = (user: User) => {
    // If the selected user is a guest and we have the instructions callback, show dialog
    if (isGuestMember(user.id) && onInstructionsComment) {
      setPendingUser(user);
      setInstructions('');
      setInstructionsDialogOpen(true);
      setIsOpen(false);
    } else {
      onOwnerChange(user);
      setIsOpen(false);
    }
  };

  const handleConfirmWithInstructions = () => {
    if (pendingUser) {
      onOwnerChange(pendingUser);
      if (instructions.trim() && onInstructionsComment) {
        onInstructionsComment(instructions.trim(), [pendingUser.id]);
      }
    }
    setInstructionsDialogOpen(false);
    setPendingUser(null);
    setInstructions('');
  };

  const handleSkipInstructions = () => {
    if (pendingUser) {
      onOwnerChange(pendingUser);
    }
    setInstructionsDialogOpen(false);
    setPendingUser(null);
    setInstructions('');
  };

  if (disabled) {
    return (
      <div className="relative opacity-60 cursor-not-allowed">
        <div className="flex items-center gap-1">
          {owner ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  style={{ backgroundColor: owner.color }}
                  className="text-xs text-white"
                >
                  {owner.initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate max-w-[100px]">{owner.name}</span>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <Plus className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-1">
          {owner ? (
            <div className="flex items-center gap-2 group/cell">
              <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:bg-accent rounded px-1 py-0.5 transition-smooth cursor-pointer"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback
                    style={{ backgroundColor: owner.color }}
                    className="text-xs text-white"
                  >
                    {owner.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate max-w-[100px]">{owner.name}</span>
              </div>
              <div
                role="button"
                tabIndex={0}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOwnerChange(undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOwnerChange(undefined);
                  }
                }}
                className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-destructive/20 transition-smooth cursor-pointer z-50"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsOpen(!isOpen)}
              className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-muted-foreground/50 transition-smooth cursor-pointer"
            >
              <Plus className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md shadow-lg border z-[9999] max-h-64 overflow-y-auto">
            {users.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {roleFilter ? `No team members with ${roleFilter} role` : 'No team members found'}
              </div>
            ) : (
              <>
                {owner && (
                  <button
                    onClick={() => {
                      onOwnerChange(undefined);
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-smooth"
                  >
                    Remove assignee
                  </button>
                )}
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-smooth"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback
                        style={{ backgroundColor: user.color }}
                        className="text-xs text-white"
                      >
                        {user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{user.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Instructions Dialog for Guest Assignment */}
      <Dialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instructions for {pendingUser?.name}</DialogTitle>
            <DialogDescription>
              Add optional instructions or notes for this guest. They will be visible in their communication tab.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Add instructions or notes for the assigned guest..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[80px] text-sm"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleSkipInstructions}>
              Skip
            </Button>
            <Button onClick={handleConfirmWithInstructions}>
              {instructions.trim() ? 'Assign with Instructions' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
