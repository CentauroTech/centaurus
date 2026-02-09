import { useState, useMemo } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useColumnVisibility,
  useColumnMemberVisibility,
  useSetColumnMemberVisibility,
  useInitializeColumnVisibility,
} from '@/hooks/useColumnVisibility';
import { COLUMNS } from '@/types/board';
import { cn } from '@/lib/utils';

export function ColumnVisibilityTab() {
  const { data: columnVisibility, isLoading: loadingColumnVisibility } = useColumnVisibility();
  const { data: memberVisibility } = useColumnMemberVisibility();
  const setColumnMemberVisibility = useSetColumnMemberVisibility();
  const initializeColumnVisibility = useInitializeColumnVisibility();
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  // Fetch team members (only centauro / non-guest)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-centauro'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, initials, color, email, role')
        .ilike('email', '%@centauro.com')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Filter to only team_member role (not god/admin since they always see everything)
  const selectableMembers = useMemo(() => {
    return teamMembers.filter(m => m.role === 'team_member' || m.role === 'member');
  }, [teamMembers]);

  // Create per-member visibility map: column_id -> Set of team_member_ids
  const memberVisibilityMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    memberVisibility?.forEach((mv) => {
      if (!map.has(mv.column_id)) {
        map.set(mv.column_id, new Set());
      }
      map.get(mv.column_id)!.add(mv.team_member_id);
    });
    return map;
  }, [memberVisibility]);

  const handleToggleMember = (columnId: string, memberId: string) => {
    const currentSet = memberVisibilityMap.get(columnId) || new Set();
    const newIds = new Set(currentSet);
    if (newIds.has(memberId)) {
      newIds.delete(memberId);
    } else {
      newIds.add(memberId);
    }
    setColumnMemberVisibility.mutate({
      columnId,
      teamMemberIds: Array.from(newIds),
    });
  };

  const handleSelectAll = (columnId: string) => {
    setColumnMemberVisibility.mutate({
      columnId,
      teamMemberIds: selectableMembers.map(m => m.id),
    });
  };

  const handleClearAll = (columnId: string) => {
    setColumnMemberVisibility.mutate({
      columnId,
      teamMemberIds: [],
    });
  };

  const columnsWithLabels = COLUMNS.filter(col => col.label);

  if (loadingColumnVisibility) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading column visibility settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg p-4 mb-6">
        <h3 className="font-medium mb-2">Column Visibility Settings</h3>
        <p className="text-sm text-muted-foreground">
          Choose which team members can see each column. God and Admin users can always see all columns.
          If no members are selected, the column is visible to all team members by default.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Column</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Visible To</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {columnsWithLabels.map((column) => {
                const assignedMembers = memberVisibilityMap.get(column.id);
                const assignedCount = assignedMembers?.size || 0;
                const isExpanded = expandedColumn === column.id;
                const isAllVisible = assignedCount === 0;

                return (
                  <tr key={column.id} className="group">
                    <td colSpan={4} className="p-0">
                      <div
                        className={cn(
                          "flex items-center px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors",
                          isExpanded && "bg-muted/20"
                        )}
                        onClick={() => setExpandedColumn(isExpanded ? null : column.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{column.label}</div>
                          <div className="text-xs text-muted-foreground">{column.id}</div>
                        </div>
                        <div className="w-20 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {column.type}
                          </Badge>
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          {isAllVisible ? (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Eye className="h-4 w-4" />
                              All team members
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap">
                              {Array.from(assignedMembers!).slice(0, 5).map(memberId => {
                                const member = selectableMembers.find(m => m.id === memberId);
                                if (!member) return null;
                                return (
                                  <Avatar key={memberId} className="h-6 w-6">
                                    <AvatarFallback
                                      style={{ backgroundColor: member.color }}
                                      className="text-[9px] text-white"
                                    >
                                      {member.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                              {assignedCount > 5 && (
                                <span className="text-xs text-muted-foreground">
                                  +{assignedCount - 5} more
                                </span>
                              )}
                              <Badge variant="secondary" className="text-xs ml-1">
                                {assignedCount} selected
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="w-8 flex justify-center">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 bg-muted/10 border-t">
                          <div className="flex items-center gap-2 py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleSelectAll(column.id); }}
                            >
                              Select All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleClearAll(column.id); }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Clear (visible to all)
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                            {selectableMembers.map((member) => {
                              const isChecked = assignedMembers?.has(member.id) || false;
                              return (
                                <div
                                  key={member.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                                    isChecked && "bg-primary/10"
                                  )}
                                  onClick={(e) => { e.stopPropagation(); handleToggleMember(column.id, member.id); }}
                                >
                                  <Checkbox checked={isChecked} />
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback
                                      style={{ backgroundColor: member.color }}
                                      className="text-[9px] text-white"
                                    >
                                      {member.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm truncate">{member.name}</span>
                                </div>
                              );
                            })}
                          </div>
                          {selectableMembers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No team members found. Only members with role "team_member" appear here.
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => initializeColumnVisibility.mutate()}
          disabled={initializeColumnVisibility.isPending}
        >
          {initializeColumnVisibility.isPending ? 'Initializing...' : 'Initialize Missing Columns'}
        </Button>
      </div>
    </div>
  );
}