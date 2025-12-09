import { useState } from 'react';
import { ExternalLink, Link } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LinkCellProps {
  value?: string;
  onChange: (value: string) => void;
}

export function LinkCell({ value, onChange }: LinkCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');

  const handleSave = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  if (value) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 text-primary hover:underline text-sm truncate max-w-full">
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">Link</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-2">
            <Input
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder="Enter URL..."
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>Save</Button>
              {value && (
                <Button size="sm" variant="outline" asChild>
                  <a href={value} target="_blank" rel="noopener noreferrer">
                    Open
                  </a>
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:bg-muted transition-smooth">
          <Link className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="Enter URL..."
            className="text-sm"
          />
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
