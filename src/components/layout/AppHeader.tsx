import { Bell, Search, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

interface AppHeaderProps {
  boardName: string;
}

export function AppHeader({ boardName }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  
  const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      {/* Left: Board Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display font-semibold text-lg text-foreground">
            {boardName}
          </h1>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9 w-64 h-9 bg-slate-100 border-0"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              {userInitials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
