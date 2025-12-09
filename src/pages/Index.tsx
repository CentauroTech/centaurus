import { useState } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { BoardView } from '@/components/board/BoardView';
import { mockWorkspaces, mockTaskGroups } from '@/data/mockData';
import { Board } from '@/types/board';

const Index = () => {
  const [selectedBoardId, setSelectedBoardId] = useState<string>('board-1');
  const [boards, setBoards] = useState<Record<string, Board>>({
    'board-1': {
      id: 'board-1',
      name: 'Project Alpha',
      icon: '🚀',
      groups: mockTaskGroups,
    },
    'board-2': {
      id: 'board-2',
      name: 'Marketing Campaign',
      icon: '📈',
      groups: [],
    },
    'board-3': {
      id: 'board-3',
      name: 'Bug Tracker',
      icon: '🐛',
      groups: [],
    },
    'board-4': {
      id: 'board-4',
      name: 'Side Projects',
      icon: '💡',
      groups: [],
    },
  });

  const currentBoard = boards[selectedBoardId];

  const handleBoardUpdate = (updatedBoard: Board) => {
    setBoards((prev) => ({
      ...prev,
      [updatedBoard.id]: updatedBoard,
    }));
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        workspaces={mockWorkspaces}
        selectedBoardId={selectedBoardId}
        onSelectBoard={setSelectedBoardId}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentBoard && (
          <>
            <AppHeader 
              boardName={currentBoard.name} 
              boardIcon={currentBoard.icon} 
            />
            <BoardView 
              board={currentBoard} 
              onBoardUpdate={handleBoardUpdate} 
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
