import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/types/board';
import { useTeamMembers } from '@/hooks/useWorkspaces';

interface OwnerCellProps {
  owner?: User;
  onOwnerChange: (owner: User | undefined) => void;
}

export function OwnerCell({ owner, onOwnerChange }: OwnerCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: teamMembers = [] } = useTeamMembers();

  // Map team members to User format
  const users: User[] = teamMembers.map(m => ({
    id: m.id,
    name: m.name,
    initials: m.initials,
    color: m.color,
  }));

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
      {owner ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 group"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
            style={{ backgroundColor: owner.color }}
          >
            {owner.initials}
          </div>
          <span className="text-sm text-foreground">{owner.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOwnerChange(undefined);
            }}
            className="opacity-0 group-hover:opacity-100 transition-smooth"
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-muted-foreground transition-smooth"
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-[100] mt-1 left-0 bg-card rounded-lg shadow-dropdown border border-border py-1 min-w-[180px] animate-fade-in">
          {users.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No team members found
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onOwnerChange(user);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-muted transition-smooth",
                  owner?.id === user.id && "bg-muted"
                )}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.initials}
                </div>
                <span className="text-sm">{user.name}</span>
              </button>
            ))
          )}
          {owner && (
            <>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  onOwnerChange(undefined);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted transition-smooth"
              >
                Remove assignee
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
