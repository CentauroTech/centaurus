import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PHASE_GUIDES, PHASE_ICON_KEYS } from '@/config/phaseGuides';
import { usePhaseGuides, useSavePhaseGuide, useDeletePhaseGuide, DbPhaseGuide } from '@/hooks/usePhaseGuides';
import { PhaseGuideEditor } from './PhaseGuideEditor';
import { BookOpen, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PHASE_OPTIONS = Object.entries(PHASE_GUIDES).map(([key, guide]) => ({
  key,
  title: guide.title,
  color: guide.color,
}));

export function GuideEditorTab() {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const { data: dbGuides, isLoading } = usePhaseGuides();
  const saveGuide = useSavePhaseGuide();
  const deleteGuide = useDeletePhaseGuide();

  const getGuideData = (phaseKey: string) => {
    // Check if there's a database override
    const dbGuide = dbGuides?.find(g => g.phase_key === phaseKey);
    if (dbGuide) {
      return {
        source: 'database' as const,
        data: {
          title: dbGuide.title,
          color: dbGuide.color,
          overview: dbGuide.overview,
          keyColumns: dbGuide.key_columns,
          workflow: dbGuide.workflow,
          roles: dbGuide.roles,
          nextPhase: dbGuide.next_phase || '',
          triggerCondition: dbGuide.trigger_condition || '',
        },
      };
    }

    // Use static config
    const staticGuide = PHASE_GUIDES[phaseKey];
    return {
      source: 'static' as const,
      data: staticGuide,
    };
  };

  const handleSave = async (phaseKey: string, data: {
    title: string;
    color: string;
    overview: string;
    keyColumns: { name: string; description: string }[];
    workflow: { step: number; action: string; detail: string }[];
    roles: { role: string; responsibility: string }[];
    nextPhase: string;
    triggerCondition: string;
  }) => {
    await saveGuide.mutateAsync({
      phase_key: phaseKey,
      title: data.title,
      color: data.color,
      overview: data.overview,
      key_columns: data.keyColumns,
      workflow: data.workflow,
      roles: data.roles,
      next_phase: data.nextPhase || null,
      trigger_condition: data.triggerCondition || null,
    });
  };

  const handleReset = async (phaseKey: string) => {
    await deleteGuide.mutateAsync(phaseKey);
  };

  const isCustomized = (phaseKey: string) => {
    return dbGuides?.some(g => g.phase_key === phaseKey);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Phase Guide Editor
          </CardTitle>
          <CardDescription>
            Customize the content shown in board guides for each production phase. 
            Changes are saved to the database and will override the default content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedPhase || ''} onValueChange={setSelectedPhase}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a phase to edit..." />
              </SelectTrigger>
              <SelectContent>
                {PHASE_OPTIONS.map((phase) => (
                  <SelectItem key={phase.key} value={phase.key}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${phase.color}`} />
                      <span>{phase.title}</span>
                      {isCustomized(phase.key) && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Customized
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPhase && isCustomized(selectedPhase) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReset(selectedPhase)}
                disabled={deleteGuide.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            )}
          </div>

          {selectedPhase && (
            <PhaseGuideEditor
              phaseKey={selectedPhase}
              guideData={getGuideData(selectedPhase)}
              onSave={(data) => handleSave(selectedPhase, data)}
              isSaving={saveGuide.isPending}
            />
          )}

          {!selectedPhase && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a phase above to edit its guide content</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick overview of all phases */}
      <Card>
        <CardHeader>
          <CardTitle>All Phases Overview</CardTitle>
          <CardDescription>
            Click on any phase to edit its guide content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {PHASE_OPTIONS.map((phase) => (
              <button
                key={phase.key}
                onClick={() => setSelectedPhase(phase.key)}
                className={`p-3 rounded-lg border text-left transition-colors hover:bg-muted/50 ${
                  selectedPhase === phase.key ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${phase.color}`} />
                  <span className="font-medium text-sm">{phase.title}</span>
                </div>
                {isCustomized(phase.key) && (
                  <Badge variant="secondary" className="text-xs">
                    Customized
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
