import { useState, useMemo } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeamMemberRolesMap, RoleType, ROLE_LABELS } from '@/hooks/useTeamMemberRoles';

export interface RoleAssignment {
  field: string;
  memberId: string;
  memberName: string;
}

interface PrivacyCellProps {
  isPrivate?: boolean;
  onChange: (isPrivate: boolean) => void;
  taskId?: string;
  onViewersChange?: (viewerIds: string[]) => void;
  onRoleAssignments?: (assignments: RoleAssignment[]) => void;
  onMakePublic?: () => void;
  onGuestDueDateChange?: (date: string) => void;
  onDateAssignedChange?: (date: string) => void;
  currentViewerIds?: string[];
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string | null;
}

type FilterCategory = 'all' | 'translator' | 'adapter' | 'mixer' | 'qc_premix' | 'qc_mix';

// Map filter categories to task fields
const CATEGORY_TO_FIELD: Record<FilterCategory, string | null> = {
  all: null,
  translator: 'traductor',
  adapter: 'adaptador',
  mixer: 'mixerMiami',
  qc_premix: 'qc1',
  qc_mix: 'qcMix',
};

const FILTER_CATEGORIES: { key: FilterCategory; label: string; roleType: RoleType | null }[] = [
  { key: 'all', label: 'All', roleType: null },
  { key: 'translator', label: 'Translators', roleType: 'translator' },
  { key: 'adapter', label: 'Adapters', roleType: 'adapter' },
  { key: 'mixer', label: 'Mixers', roleType: 'mixer' },
  { key: 'qc_premix', label: 'QC Premix', roleType: 'qc_premix' },
  { key: 'qc_mix', label: 'QC Mix', roleType: 'qc_mix' },
];

export function PrivacyCell({ 
  isPrivate = false, 
  onChange, 
  taskId,
  onViewersChange,
  onRoleAssignments,
  onMakePublic,
  onGuestDueDateChange,
  onDateAssignedChange,
  currentViewerIds = []
}: PrivacyCellProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);
  const [selectedViewers, setSelectedViewers] = useState<string[]>(currentViewerIds);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);

  // Get the roles map from settings
  const rolesMap = useTeamMemberRolesMap();

  // Fetch guests (team members without @centauro.com email)
  const { data: guests = [] } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, initials, color, email')
        .or('email.is.null,email.not.ilike.%@centauro.com');
      
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  // Filter guests based on their assigned roles from Settings
  const filteredGuests = useMemo(() => {
    if (activeFilter === 'all') {
      return guests;
    }
    
    const category = FILTER_CATEGORIES.find(c => c.key === activeFilter);
    if (!category || !category.roleType) return guests;
    
    // Filter guests who have the selected role assigned in Settings
    return guests.filter(guest => {
      const memberRoles = rolesMap.get(guest.id) || [];
      return memberRoles.includes(category.roleType!);
    });
  }, [guests, activeFilter, rolesMap]);

  const handlePrivacyClick = () => {
    if (!isPrivate) {
      // Opening privacy - show dialog to select guests
      setSelectedViewers(currentViewerIds);
      setActiveFilter('all');
      setRoleAssignments([]);
      setDialogOpen(true);
    } else {
      // Already private - show confirmation to make public
      setConfirmPublicOpen(true);
    }
  };

  const handleConfirmMakePublic = () => {
    if (onMakePublic) {
      onMakePublic();
    } else {
      onChange(false);
      if (onViewersChange) {
        onViewersChange([]);
      }
    }
    setConfirmPublicOpen(false);
  };

  const handleConfirmPrivate = () => {
    onChange(true);
    if (onViewersChange) {
      onViewersChange(selectedViewers);
    }
    if (onRoleAssignments && roleAssignments.length > 0) {
      onRoleAssignments(roleAssignments);
    }
    
    // Set date_assigned to today when guest is assigned
    if (onDateAssignedChange && selectedViewers.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      onDateAssignedChange(today);
    }
    
    // Set guest_due_date to +1 business day when guest is assigned
    if (onGuestDueDateChange && selectedViewers.length > 0) {
      const tomorrow = new Date();
      let daysToAdd = 1;
      // Skip weekends
      tomorrow.setDate(tomorrow.getDate() + daysToAdd);
      while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      const dueDateStr = tomorrow.toISOString().split('T')[0];
      onGuestDueDateChange(dueDateStr);
    }
    setDialogOpen(false);
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setSelectedViewers(currentViewerIds);
    setRoleAssignments([]);
  };

  const toggleViewer = (viewer: TeamMember) => {
    const isCurrentlySelected = selectedViewers.includes(viewer.id);
    
    if (isCurrentlySelected) {
      // Removing viewer - also remove any role assignments for this viewer
      setSelectedViewers(prev => prev.filter(id => id !== viewer.id));
      setRoleAssignments(prev => prev.filter(a => a.memberId !== viewer.id));
    } else {
      // Adding viewer
      setSelectedViewers(prev => [...prev, viewer.id]);
      
      // If we're in a specific category (not 'all'), also add a role assignment
      const field = CATEGORY_TO_FIELD[activeFilter];
      if (field) {
        // Remove any existing assignment for this field (only one person per role)
        setRoleAssignments(prev => {
          const filtered = prev.filter(a => a.field !== field);
          return [...filtered, { field, memberId: viewer.id, memberName: viewer.name }];
        });
      }
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handlePrivacyClick}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md transition-all",
                isPrivate
                  ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {isPrivate ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPrivate ? 'Private - Click to make public' : 'Public - Click to make private'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Which guests should see this?</DialogTitle>
            <DialogDescription>
              Select the guests who will be able to view this private task. Team members with @centauro.com emails can always see all tasks.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2">
              {FILTER_CATEGORIES.map((category) => (
                <Button
                  key={category.key}
                  variant={activeFilter === category.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(category.key)}
                  className="text-xs"
                >
                  {category.label}
                </Button>
              ))}
            </div>

            {/* Role assignment indicator */}
            {roleAssignments.length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <p className="font-medium mb-1">Role assignments:</p>
                {roleAssignments.map(a => (
                  <p key={a.field}>{a.field}: {a.memberName}</p>
                ))}
              </div>
            )}

            {/* Guest list */}
            {filteredGuests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No guests found in this category.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors",
                      selectedViewers.includes(guest.id) && "bg-primary/10"
                    )}
                    onClick={() => toggleViewer(guest)}
                  >
                    <Checkbox
                      checked={selectedViewers.includes(guest.id)}
                      onCheckedChange={() => toggleViewer(guest)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        style={{ backgroundColor: guest.color }}
                        className="text-xs text-white"
                      >
                        {guest.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{guest.name}</p>
                      {guest.email && (
                        <p className="text-xs text-muted-foreground truncate">{guest.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPrivate}>
              <Lock className="w-4 h-4 mr-2" />
              Make Private
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Make Public Dialog */}
      <Dialog open={confirmPublicOpen} onOpenChange={setConfirmPublicOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Make task public?</DialogTitle>
            <DialogDescription>
              Are you sure you want to make this task public? The guest viewers will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmPublicOpen(false)}>
              No
            </Button>
            <Button onClick={handleConfirmMakePublic}>
              <Unlock className="w-4 h-4 mr-2" />
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
