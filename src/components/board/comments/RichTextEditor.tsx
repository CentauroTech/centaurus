import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
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
import { useEffect, useCallback } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSend?: () => void;
  placeholder?: string;
  isSending?: boolean;
  editable?: boolean;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  onSend,
  placeholder = 'Write an update...',
  isSending = false,
  editable = true,
  className,
}: RichTextEditorProps) {
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
  });

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
    </div>
  );
}

// Read-only display component for rich text content
export function RichTextDisplay({ content, className }: { content: string; className?: string }) {
  // Render HTML content with proper styling - no height restrictions
  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none text-foreground/90",
        "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h2]:my-2 [&_h3]:my-1.5",
        "[&_li]:my-0.5",
        "break-words",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}