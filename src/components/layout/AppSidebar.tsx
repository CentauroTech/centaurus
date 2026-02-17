import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Home, Search, Plus, Settings, HelpCircle, Inbox, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceWithBoards } from '@/hooks/useWorkspaces';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useCanAccessFeature } from '@/hooks/useFeatureSettings';
import centaurusLogo from '@/assets/centaurus-logo.jpeg';

interface AppSidebarProps {
  workspaces: WorkspaceWithBoards[];
  selectedBoardId: string | null;
  onSelectBoard: (boardId: string) => void;
}

export function AppSidebar({ workspaces, selectedBoardId, onSelectBoard }: AppSidebarProps) {
  const navigate = useNavigate();
  const unreadCount = useUnreadNotificationCount();
  const { canAccess: canAccessLinguistic } = useCanAccessFeature('linguistic_control_center');
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<string[]>(() => 
    workspaces.length > 0 ? [workspaces[0].id] : []
  );

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };

  return (
    <aside className="w-64 bg-sidebar-bg text-sidebar-foreground flex flex-col h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src={centaurusLogo} 
            alt="Centaurus Logo" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <span className="font-display font-semibold text-lg">Centaurus</span>
            <span className="text-xs text-white/50">v1.2.0</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-hover/50 text-sm text-white/70 hover:bg-sidebar-hover transition-smooth">
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2">
        <div className="space-y-1 mb-4">
          <SidebarItem icon={<Home className="w-4 h-4" />} label="Home" />
          <SidebarItem 
            icon={<Inbox className="w-4 h-4" />} 
            label="Inbox" 
            badge={unreadCount > 0 ? unreadCount : undefined}
            onClick={() => navigate('/notifications')}
          />
          <SidebarItem icon={<Plus className="w-4 h-4" />} label="New Board" />
          {canAccessLinguistic && (
            <SidebarItem 
              icon={<Languages className="w-4 h-4" />} 
              label="Linguistic Center" 
              onClick={() => navigate('/phase/linguistic')}
            />
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="px-3 py-2 text-xs font-medium text-white/50 uppercase tracking-wider">
            Workspaces
          </p>
          
          {workspaces.map((workspace) => (
            <WorkspaceItem
              key={workspace.id}
              workspace={workspace}
              isExpanded={expandedWorkspaces.includes(workspace.id)}
              onToggle={() => toggleWorkspace(workspace.id)}
              selectedBoardId={selectedBoardId}
              onSelectBoard={onSelectBoard}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <SidebarItem icon={<HelpCircle className="w-4 h-4" />} label="Help" />
        <SidebarItem 
          icon={<Settings className="w-4 h-4" />} 
          label="Settings" 
          onClick={() => navigate('/settings')}
        />
      </div>
    </aside>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  isActive = false,
  badge,
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  isActive?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-smooth",
        isActive 
          ? "bg-sidebar-active text-white" 
          : "text-white/80 hover:bg-sidebar-hover hover:text-white"
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function WorkspaceItem({
  workspace,
  isExpanded,
  onToggle,
  selectedBoardId,
  onSelectBoard,
}: {
  workspace: WorkspaceWithBoards;
  isExpanded: boolean;
  onToggle: () => void;
  selectedBoardId: string | null;
  onSelectBoard: (boardId: string) => void;
}) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/80 hover:bg-sidebar-hover hover:text-white transition-smooth"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="font-medium">{workspace.name}</span>
      </button>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5 animate-fade-in">
          {workspace.boards.map((board) => (
            <button
              key={board.id}
              onClick={() => onSelectBoard(board.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-smooth",
                selectedBoardId === board.id
                  ? "bg-sidebar-active text-white"
                  : "text-white/70 hover:bg-sidebar-hover hover:text-white",
                board.is_hq && "font-semibold"
              )}
            >
              <span className="truncate">{board.name}</span>
              {board.is_hq && (
                <span className="ml-auto text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">HQ</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
