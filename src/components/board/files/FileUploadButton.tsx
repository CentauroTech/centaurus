import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FILE_CATEGORIES, FileCategory } from '@/hooks/useTaskFiles';

interface FileUploadButtonProps {
  onUpload: (file: File, category: FileCategory) => Promise<void>;
  isUploading: boolean;
  currentPhase?: string;
}

export function FileUploadButton({ onUpload, isUploading, currentPhase }: FileUploadButtonProps) {
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCategorySelect = (category: FileCategory) => {
    setSelectedCategory(category);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file, selectedCategory);
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.mp3,.wav,.mp4,.mov,.zip"
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {FILE_CATEGORIES.map((cat) => (
            <DropdownMenuItem
              key={cat.value}
              onClick={() => handleCategorySelect(cat.value)}
            >
              {cat.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
