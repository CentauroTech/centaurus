import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User } from '@/types/board';
import { useTeamMembers } from '@/hooks/useWorkspaces';
import { cn } from '@/lib/utils';

interface PeopleCellProps {
  people?: User[];
  onChange: (people: User[]) => void;
}

export function PeopleCell({ people = [], onChange }: PeopleCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: teamMembers = [] } = useTeamMembers();

  // Map team members to User format
  const users: User[] = teamMembers.map(m => ({
    id: m.id,
    name: m.name,
    initials: m.initials,
    color: m.color,
  }));

  const togglePerson = (user: User) => {
    const exists = people.some(p => p.id === user.id);
    if (exists) {
      onChange(people.filter(p => p.id !== user.id));
    } else {
      onChange([...people, user]);
    }
  };

  const removePerson = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(people.filter(p => p.id !== userId));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 min-w-0">
          {people.length > 0 ? (
            <div className="flex -space-x-2">
              {people.slice(0, 3).map((person) => (
                <Avatar key={person.id} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback
                    style={{ backgroundColor: person.color }}
                    className="text-xs text-white"
                  >
                    {person.initials}
                  </AvatarFallback>
                </Avatar>
              ))}
              {people.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                  +{people.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <Plus className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 z-[100]" align="start">
        <div className="space-y-1">
          {users.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No team members found
            </div>
          ) : (
            users.map((user) => {
              const isSelected = people.some(p => p.id === user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => togglePerson(user)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-smooth",
                    isSelected && "bg-accent"
                  )}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback
                      style={{ backgroundColor: user.color }}
                      className="text-xs text-white"
                    >
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left truncate">{user.name}</span>
                  {isSelected && (
                    <X 
                      className="w-4 h-4 text-muted-foreground hover:text-foreground" 
                      onClick={(e) => removePerson(user.id, e)}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
