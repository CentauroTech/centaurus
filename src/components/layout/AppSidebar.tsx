import { useState } from 'react';
import { ChevronDown, ChevronRight, Home, Search, Plus, Settings, HelpCircle, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Workspace, Board } from '@/types/board';

interface AppSidebarProps {
  workspaces: Workspace[];
  selectedBoardId: string | null;
  onSelectBoard: (boardId: string) => void;
}

export function AppSidebar({ workspaces, selectedBoardId, onSelectBoard }: AppSidebarProps) {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<string[]>(['ws-1']);

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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-semibold text-lg">workday</span>
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
          <SidebarItem icon={<Plus className="w-4 h-4" />} label="New Board" />
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
        <SidebarItem icon={<Settings className="w-4 h-4" />} label="Settings" />
      </div>
    </aside>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  isActive = false,
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  isActive?: boolean;
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
      <span>{label}</span>
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
  workspace: Workspace;
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
                  : "text-white/70 hover:bg-sidebar-hover hover:text-white"
              )}
            >
              <span>{board.icon}</span>
              <span className="truncate">{board.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
