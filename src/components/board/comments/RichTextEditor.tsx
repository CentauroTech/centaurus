import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Undo,
  Redo,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MentionUser } from './MentionList';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSend?: () => void;
  placeholder?: string;
  isSending?: boolean;
  editable?: boolean;
  className?: string;
  mentionUsers?: MentionUser[];
}

// Inline mention dropdown component
function MentionDropdown({
  items,
  command,
  selectedIndex,
  clientRect,
}: {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
  selectedIndex: number;
  clientRect: (() => DOMRect | null) | null;
}) {
  const rect = clientRect?.();
  if (!rect) return null;

  return createPortal(
    <div
      className="z-[9999] min-w-[200px] max-h-[200px] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
      }}
    >
      {items.length === 0 ? (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          No users found
        </div>
      ) : (
        items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => command({ id: item.id, label: item.name })}
            className={cn(
              "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback
                style={{ backgroundColor: item.color }}
                className="text-white text-xs"
              >
                {item.initials}
              </AvatarFallback>
            </Avatar>
            <span>{item.name}</span>
          </button>
        ))
      )}
    </div>,
    document.body
  );
}

export function RichTextEditor({
  content,
  onChange,
  onSend,
  placeholder = 'Write an update... Use @ to mention',
  isSending = false,
  editable = true,
  className,
  mentionUsers = [],
}: RichTextEditorProps) {
  const [mentionState, setMentionState] = useState<{
    isOpen: boolean;
    items: MentionUser[];
    selectedIndex: number;
    command: ((item: { id: string; label: string }) => void) | null;
    clientRect: (() => DOMRect | null) | null;
  }>({
    isOpen: false,
    items: [],
    selectedIndex: 0,
    command: null,
    clientRect: null,
  });

  const mentionSuggestion = useMemo(() => ({
    items: ({ query }: { query: string }) => {
      return mentionUsers
        .filter((user) =>
          user.name.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8);
    },
    render: () => {
      return {
        onStart: (props: SuggestionProps<MentionUser>) => {
          setMentionState({
            isOpen: true,
            items: props.items,
            selectedIndex: 0,
            command: props.command,
            clientRect: props.clientRect,
          });
        },
        onUpdate: (props: SuggestionProps<MentionUser>) => {
          setMentionState((prev) => ({
            ...prev,
            items: props.items,
            clientRect: props.clientRect,
          }));
        },
        onKeyDown: (props: SuggestionKeyDownProps) => {
          if (props.event.key === 'Escape') {
            setMentionState((prev) => ({ ...prev, isOpen: false }));
            return true;
          }
          if (props.event.key === 'ArrowUp') {
            setMentionState((prev) => ({
              ...prev,
              selectedIndex: (prev.selectedIndex + prev.items.length - 1) % prev.items.length,
            }));
            return true;
          }
          if (props.event.key === 'ArrowDown') {
            setMentionState((prev) => ({
              ...prev,
              selectedIndex: (prev.selectedIndex + 1) % prev.items.length,
            }));
            return true;
          }
          if (props.event.key === 'Enter') {
            const item = mentionState.items[mentionState.selectedIndex];
            if (item && mentionState.command) {
              mentionState.command({ id: item.id, label: item.name });
              return true;
            }
          }
          return false;
        },
        onExit: () => {
          setMentionState((prev) => ({ ...prev, isOpen: false }));
        },
      };
    },
  }), [mentionUsers, mentionState.items, mentionState.selectedIndex, mentionState.command]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-primary/20 text-primary rounded px-1 py-0.5 font-medium',
        },
        suggestion: mentionSuggestion,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-3 text-sm',
      },
    },
  }, [mentionSuggestion]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && onSend) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border border-border rounded-lg bg-background overflow-hidden", className)} onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-0.5 p-1.5 border-b border-border bg-muted/30 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('bold') && "bg-accent")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('italic') && "bg-accent")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('underline') && "bg-accent")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('highlight') && "bg-accent")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </Button>
          
          <div className="w-px h-5 bg-border mx-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('paragraph') && !editor.isActive('heading') && "bg-accent")}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Body text"
          >
            <Type className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('heading', { level: 1 }) && "bg-accent")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('heading', { level: 2 }) && "bg-accent")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('heading', { level: 3 }) && "bg-accent")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('bulletList') && "bg-accent")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive('orderedList') && "bg-accent")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </Button>
          
          <div className="w-px h-5 bg-border mx-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive({ textAlign: 'left' }) && "bg-accent")}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive({ textAlign: 'center' }) && "bg-accent")}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </Button>
          
          <div className="w-px h-5 bg-border mx-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="w-3.5 h-3.5" />
          </Button>

          {onSend && (
            <>
              <div className="flex-1" />
              <Button
                type="button"
                size="sm"
                onClick={onSend}
                disabled={isSending || !editor.getText().trim()}
                className="h-7 px-3"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Send
              </Button>
            </>
          )}
        </div>
      )}
      
      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Mention Dropdown */}
      {mentionState.isOpen && mentionState.command && (
        <MentionDropdown
          items={mentionState.items}
          command={mentionState.command}
          selectedIndex={mentionState.selectedIndex}
          clientRect={mentionState.clientRect}
        />
      )}
    </div>
  );
}

// Read-only display component for rich text content
export function RichTextDisplay({ content, className }: { content: string; className?: string }) {
  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none text-foreground/90",
        "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h2]:my-2 [&_h3]:my-1.5",
        "[&_li]:my-0.5",
        "[&_.mention]:bg-primary/20 [&_.mention]:text-primary [&_.mention]:rounded [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:font-medium",
        "break-words",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
