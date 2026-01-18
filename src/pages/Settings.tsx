import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const BRANCH_COLORS: Record<Branch, string> = {
  Colombia: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  Miami: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  Brazil: 'bg-green-500/20 text-green-700 border-green-500/30',
  Mexico: 'bg-red-500/20 text-red-700 border-red-500/30',
};

export default function Settings() {
  const navigate = useNavigate();
  const { canManageTeamMembers, isProjectManager } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<Branch | 'all'>('all');

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
      
      return matchesSearch && matchesBranch;
    });
  }, [teamMembers, searchQuery, filterBranch, branchesMap]);

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

  const isLoading = loadingMembers || loadingBranches || loadingRoles;

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
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage team member branches and roles
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="directory" className="space-y-6">
          <TabsList>
            <TabsTrigger value="directory" className="gap-2">
              <Users className="h-4 w-4" />
              Team Directory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
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
                        <th className="text-left px-4 py-3 font-medium">Member</th>
                        <th className="text-left px-4 py-3 font-medium">Branches</th>
                        <th className="text-left px-4 py-3 font-medium">Roles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredMembers.map((member) => {
                        const memberBranches = branchesMap.get(member.id) || [];
                        const memberRoles = rolesMap.get(member.id) || [];

                        return (
                          <tr key={member.id} className="hover:bg-muted/30">
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
                                  <div className="text-sm text-muted-foreground">
                                    {member.email || 'No email'}
                                  </div>
                                </div>
                              </div>
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
                          <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
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
        </Tabs>
      </main>
    </div>
  );
}
