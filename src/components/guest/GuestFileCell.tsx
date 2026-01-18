import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTaskFiles, TaskFileRecord } from '@/hooks/useTaskFiles';

interface GuestFileCellProps {
  taskId: string;
  category: string;
  label: string;
}

export function GuestFileCell({ taskId, category, label }: GuestFileCellProps) {
  const { data: files, isLoading } = useTaskFiles(taskId, true);
  
  // Filter to guest-accessible files in this category
  const categoryFiles = files?.filter(
    f => f.is_guest_accessible && f.file_category === category
  ) || [];

  if (isLoading) {
    return <span className="text-muted-foreground text-xs">Loading...</span>;
  }

  if (categoryFiles.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // Show first file with option to see more
  const firstFile = categoryFiles[0];
  const hasMore = categoryFiles.length > 1;

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              window.open(firstFile.url, '_blank');
            }}
          >
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="truncate max-w-[60px]">{firstFile.name.split('.')[0]}</span>
            {hasMore && (
              <span className="text-muted-foreground">+{categoryFiles.length - 1}</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            {categoryFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between gap-2">
                <span className="text-xs truncate">{file.name}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(file.url, '_blank');
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  <a 
                    href={file.url} 
                    download={file.name}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Download className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
