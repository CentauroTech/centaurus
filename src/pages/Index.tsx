import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { BoardView } from '@/components/board/BoardView';
import { useBoard } from '@/hooks/useWorkspaces';
import { useAccessibleWorkspaces } from '@/hooks/useAccessibleWorkspaces';
import { usePermissions } from '@/hooks/usePermissions';

// Helper to create URL-friendly slugs from board names
const createBoardSlug = (workspaceName: string, boardName: string): string => {
  const wsPrefix = workspaceName.toLowerCase().replace(/\s+/g, '-').slice(0, 3);
  const boardSlug = boardName.toLowerCase().replace(/\s+/g, '-');
  return `${wsPrefix}-${boardSlug}`;
};

const Index = () => {
  const navigate = useNavigate();
  const { boardSlug } = useParams<{ boardSlug: string }>();
  const [searchParams] = useSearchParams();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const { data: workspaces, isLoading: workspacesLoading } = useAccessibleWorkspaces();
  const { data: currentBoard, isLoading: boardLoading } = useBoard(selectedBoardId);
  const { role, isLoading: permissionsLoading } = usePermissions();

  // Build a map of slug -> boardId for quick lookup
  const slugToBoardMap = useMemo(() => {
    const map = new Map<string, string>();
    workspaces?.forEach(ws => {
      ws.boards.forEach(board => {
        const slug = createBoardSlug(ws.name, board.name);
        map.set(slug, board.id);
      });
    });
    return map;
  }, [workspaces]);

  // Build reverse map: boardId -> { slug, workspaceName }
  const boardIdToInfoMap = useMemo(() => {
    const map = new Map<string, { slug: string; workspaceName: string }>();
    workspaces?.forEach(ws => {
      ws.boards.forEach(board => {
        const slug = createBoardSlug(ws.name, board.name);
        map.set(board.id, { slug, workspaceName: ws.name });
      });
    });
    return map;
  }, [workspaces]);

  // Redirect guests to guest dashboard
  useEffect(() => {
    if (!permissionsLoading && role === 'guest') {
      const taskId = searchParams.get('task');
      const redirectUrl = taskId ? `/guest-dashboard?task=${taskId}` : '/guest-dashboard';
      navigate(redirectUrl, { replace: true });
    }
  }, [role, permissionsLoading, navigate, searchParams]);

  // Resolve board from URL slug or default to first board
  useEffect(() => {
    if (!workspaces || workspaces.length === 0) return;
    
    if (boardSlug) {
      const boardId = slugToBoardMap.get(boardSlug);
      if (boardId) {
        setSelectedBoardId(boardId);
        return;
      }
    }
    
    // No slug or invalid slug - redirect to first available board
    const firstWorkspace = workspaces[0];
    if (firstWorkspace.boards.length > 0) {
      const firstBoard = firstWorkspace.boards[0];
      const slug = createBoardSlug(firstWorkspace.name, firstBoard.name);
      navigate(`/${slug}`, { replace: true });
      setSelectedBoardId(firstBoard.id);
    }
  }, [workspaces, boardSlug, slugToBoardMap, navigate]);

  // Handle board selection - update URL
  const handleSelectBoard = useCallback((boardId: string) => {
    const info = boardIdToInfoMap.get(boardId);
    if (info) {
      navigate(`/${info.slug}`);
    }
    setSelectedBoardId(boardId);
  }, [boardIdToInfoMap, navigate]);

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
        onSelectBoard={handleSelectBoard}
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
