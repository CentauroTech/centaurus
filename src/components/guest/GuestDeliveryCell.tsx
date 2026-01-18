import { useState, useRef } from 'react';
import { Upload, FileText, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTaskFiles, useUploadTaskFile, TaskFileRecord } from '@/hooks/useTaskFiles';
import { toast } from 'sonner';

interface GuestDeliveryCellProps {
  taskId: string;
  disabled?: boolean;
}

export function GuestDeliveryCell({ taskId, disabled }: GuestDeliveryCellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: files, isLoading } = useTaskFiles(taskId, true);
  const uploadFile = useUploadTaskFile(taskId);
  
  // Filter to delivery files
  const deliveryFiles = files?.filter(f => f.file_category === 'delivery') || [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadFile.mutateAsync({
        file,
        category: 'delivery',
        isGuestAccessible: true, // Guest uploads are guest accessible
      });
      toast.success('Delivery file uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return <span className="text-muted-foreground text-xs">Loading...</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploadFile.isPending}
      />
      
      {deliveryFiles.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5 text-xs text-green-600"
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  fileInputRef.current?.click();
                }
              }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{deliveryFiles.length} file{deliveryFiles.length > 1 ? 's' : ''}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-1">
              {deliveryFiles.map(file => (
                <div key={file.id} className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span className="text-xs">{file.name}</span>
                </div>
              ))}
              {!disabled && <p className="text-xs text-muted-foreground mt-2">Click to upload more</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={disabled || uploadFile.isPending}
        >
          {uploadFile.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>Upload</span>
        </Button>
      )}
    </div>
  );
}
