import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function parseLocalDate(dateStr: string): Date {
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return new Date(dateStr);
}

interface EditableMetadataCellProps {
  taskId: string;
  label: string;
  shortLabel: string;
  value: string | null;
  rawValue: any;
  dbColumn: string;
  type: 'date' | 'text';
  editable: boolean;
}

export function EditableMetadataCell({
  taskId,
  label,
  shortLabel,
  value,
  rawValue,
  dbColumn,
  type,
  editable,
}: EditableMetadataCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(rawValue || "");
  const [dateOpen, setDateOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextValue(rawValue || "");
  }, [rawValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const saveValue = async (newValue: any) => {
    const { error } = await supabase
      .from('tasks')
      .update({ [dbColumn]: newValue, last_updated: new Date().toISOString() })
      .eq('id', taskId);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(`${label} updated`);
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    await saveValue(dateStr);
    setDateOpen(false);
  };

  const handleTextSave = async () => {
    setIsEditing(false);
    const trimmed = textValue.trim();
    if (trimmed !== (rawValue || "")) {
      await saveValue(trimmed || null);
    }
  };

  if (!editable) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {shortLabel}
        </span>
        <span className="text-[13px] font-medium text-foreground">
          {value || '—'}
        </span>
      </div>
    );
  }

  if (type === 'date') {
    const selectedDate = rawValue ? parseLocalDate(String(rawValue)) : undefined;

    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {shortLabel}
        </span>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "text-[13px] font-medium text-left rounded px-1 -mx-1 py-0.5 transition-colors duration-150",
                "hover:bg-muted/60 cursor-pointer",
                value ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {value || '—'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" side="bottom">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Text type
  if (isEditing) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {shortLabel}
        </span>
        <Input
          ref={inputRef}
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleTextSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTextSave();
            if (e.key === 'Escape') { setTextValue(rawValue || ""); setIsEditing(false); }
          }}
          className="h-6 text-[13px] font-medium px-1 -mx-1 py-0 border-muted"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {shortLabel}
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          "text-[13px] font-medium text-left rounded px-1 -mx-1 py-0.5 transition-colors duration-150",
          "hover:bg-muted/60 cursor-pointer",
          value ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {value || '—'}
      </button>
    </div>
  );
}
