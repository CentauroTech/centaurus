import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTaskFiles, TaskFileRecord } from '@/hooks/useTaskFiles';
import { getSignedFileUrl } from '@/hooks/useSignedUrl';
import { toast } from 'sonner';
import { useState } from 'react';

interface GuestFileCellProps {
  taskId: string;
  category: string;
  label: string;
  phase?: string;
}

// Phase-aware file category mapping
// Translation phase: show 'script' files (original script to translate)
// Adaptation phase: show 'translated' files (translator's output to adapt)
const getDisplayCategory = (requestedCategory: string, phase?: string): string => {
  if (!phase) return requestedCategory;
  
  // For "File to Translate" column - shows original script
  if (requestedCategory === 'script') {
    return 'script';
  }
  
  // For "File to Adapt" column
  if (requestedCategory === 'translated') {
    // In adaptation phase, show translated files (from translator)
    return 'translated';
  }
  
  return requestedCategory;
};

export function GuestFileCell({ taskId, category, label, phase }: GuestFileCellProps) {
  const { data: files, isLoading } = useTaskFiles(taskId, true);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  
  // Determine which category to display based on phase
  const displayCategory = getDisplayCategory(category, phase);
  
  // Filter to guest-accessible files in this category
  const categoryFiles = files?.filter(
    f => f.is_guest_accessible && f.file_category === displayCategory
  ) || [];

  // Handle file download with signed URL
  const handleDownload = async (file: TaskFileRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      setDownloadingFile(file.id);
      const signedUrl = await getSignedFileUrl(file.url);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
  };

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
            onClick={(e) => handleDownload(firstFile, e)}
            disabled={downloadingFile === firstFile.id}
          >
            {downloadingFile === firstFile.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-primary" />
            )}
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
                    onClick={(e) => handleDownload(file, e)}
                    disabled={downloadingFile === file.id}
                  >
                    {downloadingFile === file.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5"
                    onClick={(e) => handleDownload(file, e)}
                    disabled={downloadingFile === file.id}
                  >
                    {downloadingFile === file.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
