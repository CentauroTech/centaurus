import { useRef, useState, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";

const COLLAPSED_HEIGHT = 96; // ~5 lines

export default function ExpandableComment({ children }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    if (!ref.current) return;
    setOverflowing(ref.current.scrollHeight > COLLAPSED_HEIGHT);
  }, [children]);

  return (
    <div>
      <div
        ref={ref}
        style={{
          maxHeight: expanded ? "none" : COLLAPSED_HEIGHT,
        }}
        className="relative overflow-hidden whitespace-pre-wrap text-sm leading-relaxed"
      >
        {children}

        {!expanded && overflowing && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>

      {overflowing && (
        <Button variant="ghost" size="sm" className="mt-1 px-0 text-xs" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </div>
  );
}
