import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { BoardView } from '@/components/board/BoardView';
import { useWorkspaces, useBoard } from '@/hooks/useWorkspaces';

const Index = () => {
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { data: currentBoard, isLoading: boardLoading } = useBoard(selectedBoardId);

  // Auto-select first board when workspaces load
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedBoardId) {
      const firstWorkspace = workspaces[0];
      if (firstWorkspace.boards.length > 0) {
        setSelectedBoardId(firstWorkspace.boards[0].id);
      }
    }
  }, [workspaces, selectedBoardId]);

  if (workspacesLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
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
