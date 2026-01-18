import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExpandableCommentProps {
  children: React.ReactNode;
  maxLines?: number;
}

export function ExpandableComment({ children, maxLines = 20 }: ExpandableCommentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Get computed line height
      const computedStyle = window.getComputedStyle(contentRef.current);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
      
      // Calculate max height based on lines
      const maxHeight = lineHeight * maxLines;
      const scrollHeight = contentRef.current.scrollHeight;
      
      if (scrollHeight > maxHeight) {
        setNeedsExpand(true);
        setCollapsedHeight(maxHeight);
      } else {
        setNeedsExpand(false);
        setCollapsedHeight(undefined);
      }
    }
  }, [children, maxLines]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={cn(
          "transition-all duration-200 leading-relaxed",
          !isExpanded && needsExpand && "overflow-hidden"
        )}
        style={{
          maxHeight: !isExpanded && needsExpand && collapsedHeight ? `${collapsedHeight}px` : undefined,
        }}
      >
        {children}
      </div>
      
      {needsExpand && !isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
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
