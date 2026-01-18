import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { BoardView } from '@/components/board/BoardView';
import { useBoard } from '@/hooks/useWorkspaces';
import { useAccessibleWorkspaces } from '@/hooks/useAccessibleWorkspaces';
import { usePermissions } from '@/hooks/usePermissions';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const { data: workspaces, isLoading: workspacesLoading } = useAccessibleWorkspaces();
  const { data: currentBoard, isLoading: boardLoading } = useBoard(selectedBoardId);
  const { role, isLoading: permissionsLoading } = usePermissions();

  // Redirect guests to guest dashboard
  useEffect(() => {
    if (!permissionsLoading && role === 'guest') {
      // Preserve any task query param for deep linking
      const taskId = searchParams.get('task');
      const redirectUrl = taskId ? `/guest-dashboard?task=${taskId}` : '/guest-dashboard';
      navigate(redirectUrl, { replace: true });
    }
  }, [role, permissionsLoading, navigate, searchParams]);

  // Auto-select first board when workspaces load
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedBoardId) {
      const firstWorkspace = workspaces[0];
      if (firstWorkspace.boards.length > 0) {
        setSelectedBoardId(firstWorkspace.boards[0].id);
      }
    }
  }, [workspaces, selectedBoardId]);

  if (workspacesLoading || permissionsLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Don't render main app for guests (they'll be redirected)
  if (role === 'guest') {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        workspaces={workspaces || []}
        selectedBoardId={selectedBoardId}
        onSelectBoard={setSelectedBoardId}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentBoard && (
          <>
            <AppHeader 
              boardName={currentBoard.name} 
            />
            <BoardView 
              board={currentBoard}
              boardId={selectedBoardId!}
            />
          </>
        )}
        {boardLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading board...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
