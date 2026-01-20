import { FileText, Image, File, Music, Video, ExternalLink, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaskFileRecord } from '@/hooks/useTaskFiles';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FileCategorySectionProps {
  title: string;
  description?: string;
  files: TaskFileRecord[];
  isGuest: boolean;
  onToggleAccess?: (fileId: string, isAccessible: boolean) => void;
  onDelete?: (fileId: string) => void;
}

export function FileCategorySection({ 
  title, 
  description,
  files, 
  isGuest,
  onToggleAccess,
  onDelete 
}: FileCategorySectionProps) {
  if (files.length === 0) return null;

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4 text-primary" />;
      case 'document':
        return <FileText className="w-4 h-4 text-orange-500" />;
      case 'audio':
        return <Music className="w-4 h-4 text-purple-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-blue-500" />;
      default:
        return <File className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-1">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent/50 transition-colors group",
              file.is_guest_accessible && "border-l-2 border-l-green-500"
            )}
          >
            {getFileIcon(file.type)}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} • {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
              </p>
            </div>

            {!isGuest && file.is_guest_accessible && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                Guest
              </Badge>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open file</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {!isGuest && onToggleAccess && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onToggleAccess(file.id, !file.is_guest_accessible)}
                      >
                        {file.is_guest_accessible ? (
                          <Eye className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {file.is_guest_accessible ? 'Hide from guests' : 'Show to guests'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {!isGuest && onDelete && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(file.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete file</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
