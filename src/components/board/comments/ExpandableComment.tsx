import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExpandableCommentProps {
  children: React.ReactNode;
  maxHeight?: number;
}

export function ExpandableComment({ children, maxHeight = 200 }: ExpandableCommentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight;
      setNeedsExpand(scrollHeight > maxHeight);
    }
  }, [children, maxHeight]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={cn(
          "transition-all duration-200",
          !isExpanded && needsExpand && "overflow-hidden"
        )}
        style={{
          maxHeight: !isExpanded && needsExpand ? `${maxHeight}px` : undefined,
        }}
      >
        {children}
      </div>
      
      {needsExpand && !isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      )}
      
      {needsExpand && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 h-7 text-xs text-primary hover:text-primary/80 px-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Show more
            </>
          )}
        </Button>
      )}
    </div>
  );
}
