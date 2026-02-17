import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users, Columns, X, Plus, Minus, Zap, DollarSign, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  useTeamMemberBranches, 
  useUpdateTeamMemberBranches, 
  BRANCHES, 
  Branch 
} from '@/hooks/useTeamMemberBranches';
import { 
  useTeamMemberRoles, 
  useUpdateTeamMemberRoles, 
  ROLE_TYPES, 
  ROLE_LABELS, 
  RoleType 
} from '@/hooks/useTeamMemberRoles';
// Column visibility is handled by ColumnVisibilityTab component
import {
  MemberType,
  MEMBER_TYPES,
  MEMBER_TYPE_LABELS,
  useUpdateTeamMemberType,
} from '@/hooks/useUpdateTeamMemberType';
import { useHasBillingRole } from '@/hooks/useMyRoles';

import { toast } from 'sonner';
import { PhaseAutomationsTab } from '@/components/settings/PhaseAutomationsTab';
import { EditableEmailCell } from '@/components/settings/EditableEmailCell';
import { BillingTab } from '@/components/settings/BillingTab';
import { GuideEditorTab } from '@/components/settings/GuideEditorTab';
import { ColumnVisibilityTab } from '@/components/settings/ColumnVisibilityTab';


const BRANCH_COLORS: Record<Branch, string> = {
  Colombia: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  Miami: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  Brazil: 'bg-green-500/20 text-green-700 border-green-500/30',
  Mexico: 'bg-red-500/20 text-red-700 border-red-500/30',
};

const TYPE_COLORS: Record<MemberType, string> = {
  god: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  admin: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  team_member: 'bg-green-500/20 text-green-700 border-green-500/30',
  guest: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
};

export default function Settings() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { canManageTeamMembers, isGod, isAdmin, isProjectManager } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<Branch | 'all'>('all');
  const [filterRole, setFilterRole] = useState<RoleType | 'all'>('all');
  const [filterType, setFilterType] = useState<MemberType | 'all'>('all');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  // Fetch team members
  const { data: teamMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch branches and roles
  const { data: branches, isLoading: loadingBranches } = useTeamMemberBranches();
  const { data: roles, isLoading: loadingRoles } = useTeamMemberRoles();
  const updateBranches = useUpdateTeamMemberBranches();
  const updateRoles = useUpdateTeamMemberRoles();
  const updateMemberType = useUpdateTeamMemberType();

  // Check billing role access
  const { hasBillingRole } = useHasBillingRole();
  

  // Create maps for quick lookup
  const branchesMap = useMemo(() => {
    const map = new Map<string, Branch[]>();
    branches?.forEach((b) => {
      const existing = map.get(b.team_member_id) || [];
      map.set(b.team_member_id, [...existing, b.branch as Branch]);
    });
    return map;
  }, [branches]);

  const rolesMap = useMemo(() => {
    const map = new Map<string, RoleType[]>();
    roles?.forEach((r) => {
      const existing = map.get(r.team_member_id) || [];
      map.set(r.team_member_id, [...existing, r.role_type as RoleType]);
    });
    return map;
  }, [roles]);

  // Filter team members
  const filteredMembers = useMemo(() => {
    if (!teamMembers) return [];
    
    return teamMembers.filter((member) => {
      // Search filter
      const matchesSearch = 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Branch filter
      const memberBranches = branchesMap.get(member.id) || [];
      const matchesBranch = 
        filterBranch === 'all' || memberBranches.includes(filterBranch);
      
      // Role filter
      const memberRoles = rolesMap.get(member.id) || [];
      const matchesRole = 
        filterRole === 'all' || memberRoles.includes(filterRole);
      
      // Type filter
      const matchesType = 
        filterType === 'all' || member.role === filterType;
      
      return matchesSearch && matchesBranch && matchesRole && matchesType;
    });
  }, [teamMembers, searchQuery, filterBranch, filterRole, filterType, branchesMap, rolesMap]);

  // Selection handlers
  const handleSelectMember = (memberId: string, checked: boolean) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(memberId);
      } else {
        next.delete(memberId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
    } else {
      setSelectedMembers(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedMembers(new Set());
  };

  // Bulk action handlers
  const handleBulkAddBranch = async (branch: Branch) => {
    const promises = Array.from(selectedMembers).map(memberId => {
      const currentBranches = branchesMap.get(memberId) || [];
      if (!currentBranches.includes(branch)) {
        return updateBranches.mutateAsync({ 
          teamMemberId: memberId, 
          branches: [...currentBranches, branch] 
        });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    toast.success(`Added ${branch} to ${selectedMembers.size} members`);
  };

  const handleBulkRemoveBranch = async (branch: Branch) => {
    const promises = Array.from(selectedMembers).map(memberId => {
      const currentBranches = branchesMap.get(memberId) || [];
      if (currentBranches.includes(branch)) {
        return updateBranches.mutateAsync({ 
          teamMemberId: memberId, 
          branches: currentBranches.filter(b => b !== branch) 
        });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    toast.success(`Removed ${branch} from ${selectedMembers.size} members`);
  };

  const handleBulkAddRole = async (role: RoleType) => {
    const promises = Array.from(selectedMembers).map(memberId => {
      const currentRoles = rolesMap.get(memberId) || [];
      if (!currentRoles.includes(role)) {
        return updateRoles.mutateAsync({ 
          teamMemberId: memberId, 
          roles: [...currentRoles, role] 
        });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    toast.success(`Added ${ROLE_LABELS[role]} to ${selectedMembers.size} members`);
  };

  const handleBulkRemoveRole = async (role: RoleType) => {
    const promises = Array.from(selectedMembers).map(memberId => {
      const currentRoles = rolesMap.get(memberId) || [];
      if (currentRoles.includes(role)) {
        return updateRoles.mutateAsync({ 
          teamMemberId: memberId, 
          roles: currentRoles.filter(r => r !== role) 
        });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    toast.success(`Removed ${ROLE_LABELS[role]} from ${selectedMembers.size} members`);
  };

  const handleBulkSetType = async (type: MemberType) => {
    const promises = Array.from(selectedMembers).map(memberId => {
      return updateMemberType.mutateAsync({ teamMemberId: memberId, type });
    });
    await Promise.all(promises);
    toast.success(`Set ${selectedMembers.size} members to ${MEMBER_TYPE_LABELS[type]}`);
  };

  const handleBranchToggle = (memberId: string, branch: Branch) => {
    const currentBranches = branchesMap.get(memberId) || [];
    const newBranches = currentBranches.includes(branch)
      ? currentBranches.filter((b) => b !== branch)
      : [...currentBranches, branch];
    
    updateBranches.mutate({ teamMemberId: memberId, branches: newBranches });
  };

  const handleRoleToggle = (memberId: string, role: RoleType) => {
    const currentRoles = rolesMap.get(memberId) || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    
    updateRoles.mutate({ teamMemberId: memberId, roles: newRoles });
  };

  const handleTypeChange = (memberId: string, type: MemberType) => {
    updateMemberType.mutate({ teamMemberId: memberId, type });
  };


  const isLoading = loadingMembers || loadingBranches || loadingRoles;
  const allSelected = filteredMembers.length > 0 && filteredMembers.every(m => selectedMembers.has(m.id));
  const someSelected = filteredMembers.some(m => selectedMembers.has(m.id));

  if (!isProjectManager) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage team members, types, branches, roles, and column visibility
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} className="gap-2 text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Bulk Actions Toolbar */}
      {selectedMembers.size > 0 && (
        <div className="sticky top-[73px] z-40 bg-primary text-primary-foreground border-b shadow-lg">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedMembers.size} selected</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-primary-foreground/20"
                  onClick={clearSelection}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="h-6 w-px bg-primary-foreground/30" />

              {/* Bulk Branch Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-1">
                    <Plus className="h-3 w-3" />
                    Add Branch
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Add Branch</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {BRANCHES.map(branch => (
                    <DropdownMenuItem 
                      key={branch}
                      onClick={() => handleBulkAddBranch(branch)}
                    >
                      {branch}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-1">
                    <Minus className="h-3 w-3" />
                    Remove Branch
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Remove Branch</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {BRANCHES.map(branch => (
                    <DropdownMenuItem 
                      key={branch}
                      onClick={() => handleBulkRemoveBranch(branch)}
                    >
                      {branch}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-6 w-px bg-primary-foreground/30" />

              {/* Bulk Role Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-1">
                    <Plus className="h-3 w-3" />
                    Add Role
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Add Role</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ROLE_TYPES.map(role => (
                    <DropdownMenuItem 
                      key={role}
                      onClick={() => handleBulkAddRole(role)}
                    >
                      {ROLE_LABELS[role]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-1">
                    <Minus className="h-3 w-3" />
                    Remove Role
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Remove Role</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ROLE_TYPES.map(role => (
                    <DropdownMenuItem 
                      key={role}
                      onClick={() => handleBulkRemoveRole(role)}
                    >
                      {ROLE_LABELS[role]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {isGod && (
                <>
                  <div className="h-6 w-px bg-primary-foreground/30" />

                  {/* Bulk Type Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm">
                        Set Type
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Set Type</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {MEMBER_TYPES.map(type => (
                        <DropdownMenuItem 
                          key={type}
                          onClick={() => handleBulkSetType(type)}
                        >
                          {MEMBER_TYPE_LABELS[type]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="directory" className="space-y-6">
          <TabsList>
            <TabsTrigger value="directory" className="gap-2">
              <Users className="h-4 w-4" />
              Team Directory
            </TabsTrigger>
            {(isGod || isAdmin) && (
              <>
                <TabsTrigger value="automations" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Phase Automations
                </TabsTrigger>
                <TabsTrigger value="columns" className="gap-2">
                  <Columns className="h-4 w-4" />
                  Column Visibility
                </TabsTrigger>
                <TabsTrigger value="guides" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Guide Editor
                </TabsTrigger>
              </>
            )}
            {hasBillingRole && (
              <TabsTrigger value="billing" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Billing
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="directory" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Filter Row */}
              <div className="flex flex-wrap gap-4">
                {/* Branch Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Branch:</span>
                  <div className="flex gap-1">
                    <Button
                      variant={filterBranch === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterBranch('all')}
                    >
                      All
                    </Button>
                    {BRANCHES.map((branch) => (
                      <Button
                        key={branch}
                        variant={filterBranch === branch ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterBranch(branch)}
                      >
                        {branch}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Role Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Role:</span>
                  <Select 
                    value={filterRole} 
                    onValueChange={(value) => setFilterRole(value as RoleType | 'all')}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {ROLE_TYPES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Type:</span>
                  <Select 
                    value={filterType} 
                    onValueChange={(value) => setFilterType(value as MemberType | 'all')}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {MEMBER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {MEMBER_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                {(filterBranch !== 'all' || filterRole !== 'all' || filterType !== 'all' || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterBranch('all');
                      setFilterRole('all');
                      setFilterType('all');
                    }}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {/* Team Members Table */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading team members...
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium w-12">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                            className={someSelected && !allSelected ? 'opacity-50' : ''}
                          />
                        </th>
                        <th className="text-left px-4 py-3 font-medium">Member</th>
                        <th className="text-left px-4 py-3 font-medium w-40">Type</th>
                        <th className="text-left px-4 py-3 font-medium">Branches</th>
                        <th className="text-left px-4 py-3 font-medium">Roles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredMembers.map((member) => {
                        const memberBranches = branchesMap.get(member.id) || [];
                        const memberRoles = rolesMap.get(member.id) || [];
                        const memberType = (member.role as MemberType) || 'team_member';
                        const isSelected = selectedMembers.has(member.id);

                        return (
                          <tr 
                            key={member.id} 
                            className={`hover:bg-muted/30 ${isSelected ? 'bg-primary/5' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  handleSelectMember(member.id, checked as boolean)
                                }
                                aria-label={`Select ${member.name}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback
                                    style={{ backgroundColor: member.color }}
                                    className="text-white text-sm font-medium"
                                  >
                                    {member.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{member.name}</div>
                                  <EditableEmailCell
                                    memberId={member.id}
                                    email={member.email}
                                    canEdit={canManageTeamMembers}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isGod ? (
                                <Select
                                  value={memberType}
                                  onValueChange={(value) => handleTypeChange(member.id, value as MemberType)}
                                >
                                  <SelectTrigger className="w-36">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MEMBER_TYPES.map((type) => (
                                      <SelectItem key={type} value={type}>
                                        <div className="flex flex-col">
                                          <span>{MEMBER_TYPE_LABELS[type]}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={TYPE_COLORS[memberType]}
                                >
                                  {MEMBER_TYPE_LABELS[memberType]}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {BRANCHES.map((branch) => {
                                  const isChecked = memberBranches.includes(branch);
                                  return (
                                    <label
                                      key={branch}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => 
                                          handleBranchToggle(member.id, branch)
                                        }
                                        disabled={!canManageTeamMembers}
                                      />
                                      <Badge
                                        variant="outline"
                                        className={isChecked ? BRANCH_COLORS[branch] : ''}
                                      >
                                        {branch}
                                      </Badge>
                                    </label>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {ROLE_TYPES.map((role) => {
                                  const isChecked = memberRoles.includes(role);
                                  return (
                                    <label
                                      key={role}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => 
                                          handleRoleToggle(member.id, role)
                                        }
                                        disabled={!canManageTeamMembers}
                                      />
                                      <span className="text-sm">
                                        {ROLE_LABELS[role]}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredMembers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                            No team members found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {(isGod || isAdmin) && (
            <TabsContent value="automations">
              <PhaseAutomationsTab />
            </TabsContent>
          )}

          {(isGod || isAdmin) && (
            <TabsContent value="columns" className="space-y-6">
              <ColumnVisibilityTab />
            </TabsContent>
          )}

          {/* Guide Editor Tab */}
          {(isGod || isAdmin) && (
            <TabsContent value="guides" className="space-y-6">
              <GuideEditorTab />
            </TabsContent>
          )}

          {/* Billing Tab - Only for users with billing role */}
          {hasBillingRole && (
            <TabsContent value="billing" className="space-y-6">
              <BillingTab />
            </TabsContent>
          )}

        </Tabs>
      </main>
    </div>
  );
}