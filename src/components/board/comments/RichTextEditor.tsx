import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import DOMPurify from 'dompurify';
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
import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface MentionUser {
  id: string;
  name: string;
  initials: string;
  color: string;
  isEveryone?: boolean; // Special flag for @everyone option
}

// Special "Everyone" mention user
export const EVERYONE_MENTION: MentionUser = {
  id: 'everyone',
  name: 'Everyone',
  initials: 'ALL',
  color: '#6366f1', // Indigo color for distinction
  isEveryone: true,
};

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSend?: () => void;
  placeholder?: string;
  isSending?: boolean;
  editable?: boolean;
  className?: string;
  mentionUsers?: MentionUser[];
  showEveryoneOption?: boolean; // Whether to show @everyone option
  hideToolbar?: boolean; // Hide the formatting toolbar
}

export function RichTextEditor({
  content,
  onChange,
  onSend,
  placeholder = 'Write an update...',
  isSending = false,
  editable = true,
  className,
  mentionUsers = [],
  showEveryoneOption = false,
  hideToolbar = false,
}: RichTextEditorProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build mention list with optional @everyone at the top
  const allMentionUsers = useMemo(() => {
    if (showEveryoneOption) {
      return [EVERYONE_MENTION, ...mentionUsers];
    }
    return mentionUsers;
  }, [mentionUsers, showEveryoneOption]);

  const filteredUsers = allMentionUsers.filter((user) =>
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 8);

  // Create custom mention extension that renders with data-id
  const CustomMention = useMemo(() => {
    return Mention.configure({
      HTMLAttributes: {
        class: 'mention',
      },
      renderHTML({ options, node }) {
        return [
          'span',
          { 
            class: options.HTMLAttributes?.class || 'mention',
            'data-id': node.attrs.id,
          },
          `@${node.attrs.label ?? node.attrs.id}`,
        ];
      },
      suggestion: {
        // We handle our own suggestion UI, so disable the default
        items: () => [],
        render: () => ({ onStart: () => {}, onUpdate: () => {}, onKeyDown: () => false, onExit: () => {} }),
      },
    });
  }, []);

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
      CustomMention,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      checkForMention(editor);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-3 text-sm',
      },
      handleKeyDown: (view, event) => {
        if (showMentions) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
            return true;
          }
          if (event.key === 'Enter' && filteredUsers.length > 0) {
            event.preventDefault();
            insertMention(filteredUsers[selectedIndex]);
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setShowMentions(false);
            return true;
          }
        }
        // Enter sends, Shift+Enter inserts newline
        if (event.key === 'Enter' && !event.shiftKey && onSend) {
          event.preventDefault();
          onSend();
          return true;
        }
        return false;
      },
    },
  });

  const checkForMention = useCallback((editorInstance: any) => {
    if (!editorInstance || allMentionUsers.length === 0) return;

    const { state } = editorInstance;
    const { selection } = state;
    const { $from } = selection;
    
    // Get text before cursor
    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
    const mentionMatch = textBefore.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setSelectedIndex(0);
      
      // Get cursor position for dropdown
      const coords = editorInstance.view.coordsAtPos(selection.from);
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        setMentionPosition({
          top: coords.bottom - containerRect.top + 4,
          left: coords.left - containerRect.left,
        });
      }
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }, [allMentionUsers.length]);

  const insertMention = useCallback((user: MentionUser) => {
    if (!editor) return;

    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    // Find the @ symbol position
    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
    const mentionMatch = textBefore.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const start = $from.pos - mentionMatch[0].length;
      const end = $from.pos;
      
      // Use TipTap's mention node type which properly preserves data-id
      editor
        .chain()
        .focus()
        .deleteRange({ from: start, to: end })
        .insertContent({
          type: 'mention',
          attrs: {
            id: user.id,
            label: user.name,
          },
        })
        .insertContent(' ')
        .run();
    }
    
    setShowMentions(false);
  }, [editor]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd+Enter also sends as a fallback
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSend) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  if (!editor) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn("border border-border rounded-lg bg-background overflow-hidden relative", className)} onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      {editable && !hideToolbar && (
        <div className="border-b border-border bg-muted/30">
          <div className="flex items-center justify-between px-1.5 py-1">
            <button
              type="button"
              onClick={() => setToolbarExpanded(!toolbarExpanded)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
            >
              {toolbarExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Format</span>
            </button>
            {onSend && (
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
            )}
          </div>
          {toolbarExpanded && (
            <div className="flex items-center gap-0.5 px-1.5 pb-1.5 flex-wrap">
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('bold') && "bg-accent")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('italic') && "bg-accent")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('underline') && "bg-accent")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('highlight') && "bg-accent")} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="w-3.5 h-3.5" /></Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('paragraph') && !editor.isActive('heading') && "bg-accent")} onClick={() => editor.chain().focus().setParagraph().run()} title="Body text"><Type className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('heading', { level: 1 }) && "bg-accent")} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><Heading1 className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('heading', { level: 2 }) && "bg-accent")} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('heading', { level: 3 }) && "bg-accent")} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><Heading3 className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('bulletList') && "bg-accent")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive('orderedList') && "bg-accent")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-3.5 h-3.5" /></Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive({ textAlign: 'left' }) && "bg-accent")} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive({ textAlign: 'center' }) && "bg-accent")} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-3.5 h-3.5" /></Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="w-3.5 h-3.5" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="w-3.5 h-3.5" /></Button>
            </div>
          )}
        </div>
      )}
      
      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Send button when toolbar is hidden */}
      {hideToolbar && onSend && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border">
          <span className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for newline</span>
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
        </div>
      )}

      {/* Mention Dropdown */}
      {showMentions && filteredUsers.length > 0 && (
        <div
          className="absolute z-50 min-w-[200px] max-h-[200px] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          style={{
            top: mentionPosition.top,
            left: mentionPosition.left,
          }}
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={cn(
                "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  style={{ backgroundColor: user.color }}
                  className="text-white text-xs"
                >
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <span>{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Read-only display component for rich text content with XSS protection
export function RichTextDisplay({ content, className }: { content: string; className?: string }) {
  // Sanitize HTML content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'span', 'mark'],
      ALLOWED_ATTR: ['class', 'data-id', 'style'],
      KEEP_CONTENT: true,
    });
  }, [content]);

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
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
