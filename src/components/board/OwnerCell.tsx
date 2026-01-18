import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/types/board';
import { useTeamMembers } from '@/hooks/useWorkspaces';

interface OwnerCellProps {
  owner?: User;
  onOwnerChange: (owner: User | undefined) => void;
  disabled?: boolean;
}

export function OwnerCell({ owner, onOwnerChange, disabled = false }: OwnerCellProps) {
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

  if (disabled) {
    return (
      <div className="relative opacity-60 cursor-not-allowed">
        {owner ? (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: owner.color }}
            >
              {owner.initials}
            </div>
            <span className="text-sm text-inherit">{owner.name}</span>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <Plus className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

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
          <span className="text-sm text-inherit">{owner.name}</span>
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
        <div className="absolute z-[9999] mt-1 left-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg shadow-dropdown border border-border py-1 min-w-[180px] animate-fade-in">
          {users.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
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
                  "w-full px-3 py-2 text-left flex items-center gap-2 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-smooth",
                  owner?.id === user.id && "bg-slate-100 dark:bg-slate-800"
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
                className="w-full px-3 py-2 text-left text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-smooth"
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