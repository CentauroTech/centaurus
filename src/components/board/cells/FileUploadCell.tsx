import { useState } from 'react';
import { FileText, Upload, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadCellProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FileUploadCell({ value, onChange, placeholder = 'Upload file' }: FileUploadCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, we'll just store the file name
      // In production, this would upload to storage and save the URL
      onChange(file.name);
    }
  };

  if (value) {
    return (
      <div 
        className="flex items-center gap-2 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className="text-sm text-inherit truncate max-w-[100px]">{value}</span>
        {isHovered && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.open(value, '_blank')}
              className="p-1 hover:bg-white/10 rounded transition-smooth"
              title="Open file"
            >
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>
            <button
              onClick={() => onChange('')}
              className="p-1 hover:bg-white/10 rounded transition-smooth"
              title="Remove file"
            >
              <X className="w-3 h-3 opacity-60" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 transition-smooth">
      <Upload className="w-4 h-4" />
      <span className="text-sm">{placeholder}</span>
      <input
        type="file"
        accept=".ppt,.pptx,.pdf,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
      />
    </label>
  );
}
