import { useState, useRef, useEffect } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUpdateTeamMemberEmail } from '@/hooks/useUpdateTeamMemberEmail';

interface EditableEmailCellProps {
  memberId: string;
  email: string | null;
  canEdit: boolean;
}

export function EditableEmailCell({ memberId, email, canEdit }: EditableEmailCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(email || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEmail = useUpdateTeamMemberEmail();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setValue(email || '');
  }, [email]);

  const handleSave = () => {
    const trimmedValue = value.trim();
    
    // Basic email validation
    if (trimmedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
      return; // Don't save invalid emails
    }

    updateEmail.mutate({ 
      teamMemberId: memberId, 
      email: trimmedValue || null 
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(email || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!canEdit) {
    return (
      <span className="text-sm text-muted-foreground">
        {email || 'No email'}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder="email@example.com"
          className="h-7 text-sm w-48"
          type="email"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleSave}
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCancel}
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground group transition-colors"
    >
      <span className={email ? '' : 'italic text-muted-foreground/60'}>
        {email || 'Add email'}
      </span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
