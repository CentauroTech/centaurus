import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, FileText, Languages, Mic, Headphones, CheckCircle2, 
  AlertTriangle, Wand2, Send, Users, ClipboardCheck, ArrowRight,
  ListChecks, Settings, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhaseGuide {
  title: string;
  icon: React.ReactNode;
  color: string;
  overview: string;
  keyColumns: { name: string; description: string }[];
  workflow: { step: number; action: string; detail: string }[];
  roles: { role: string; responsibility: string }[];
  nextPhase: string;
  triggerCondition: string;
}

const PHASE_GUIDES: Record<string, PhaseGuide> = {
  kickoff: {
    title: 'Kickoff',
    icon: <Rocket className="h-6 w-6" />,
    color: 'bg-blue-500',
    overview: 'The Kickoff phase is where all new projects begin. This is the setup stage where project managers configure all essential metadata, assign team members, and prepare the project for production.',
    keyColumns: [
      { name: 'Branch', description: 'Select the production branch (Miami, Colombia, etc.)' },
      { name: 'Project Manager', description: 'Assign the PM who will oversee this project' },
      { name: 'Studio Assigned', description: 'Set the date to generate the Work Order number' },
      { name: 'Target Language', description: 'Select the language(s) for dubbing' },
      { name: 'Services', description: 'Define what services are needed (Dub, Mix, etc.)' },
      { name: 'Episodes', description: 'Number of episodes in this project' },
    ],
    workflow: [
      { step: 1, action: 'Create Work Order', detail: 'Use "Create WO" button to add new projects with all required metadata' },
      { step: 2, action: 'Set Studio Date', detail: 'Assign the studio date - this generates the unique WO# automatically' },
      { step: 3, action: 'Configure Metadata', detail: 'Fill in client, format, runtime, delivery dates, and other project details' },
      { step: 4, action: 'Upload Assets', detail: 'Add any initial files (scripts, references) to the task' },
      { step: 5, action: 'Launch Project', detail: 'Set status to "Launch" to move the project to Assets phase' },
    ],
    roles: [
      { role: 'Project Manager', responsibility: 'Creates and configures all project metadata, manages timeline' },
      { role: 'Admin', responsibility: 'Can assist with project setup and override settings' },
    ],
    nextPhase: 'Assets',
    triggerCondition: 'Status set to "Launch"',
  },
  assets: {
    title: 'Assets',
    icon: <FileText className="h-6 w-6" />,
    color: 'bg-purple-500',
    overview: 'The Assets phase focuses on gathering and organizing all materials needed for production. This includes video files, reference materials, style guides, and any client-provided documentation.',
    keyColumns: [
      { name: 'People', description: 'Team members assigned to gather assets' },
      { name: 'Show Guide', description: 'Link to the style/show guide' },
      { name: 'Files', description: 'Upload and organize all project assets' },
    ],
    workflow: [
      { step: 1, action: 'Review Requirements', detail: 'Check project metadata for required deliverables' },
      { step: 2, action: 'Gather Materials', detail: 'Collect all video files, scripts, and reference materials' },
      { step: 3, action: 'Upload Files', detail: 'Add all assets to the task with proper categorization' },
      { step: 4, action: 'Verify Completeness', detail: 'Confirm all required materials are present' },
      { step: 5, action: 'Mark Complete', detail: 'Set status to "Done" to advance to Translation' },
    ],
    roles: [
      { role: 'People (Assigned)', responsibility: 'Collects and uploads all required assets' },
      { role: 'Project Manager', responsibility: 'Verifies asset completeness and quality' },
    ],
    nextPhase: 'Translation',
    triggerCondition: 'Status set to "Done"',
  },
  translation: {
    title: 'Translation',
    icon: <Languages className="h-6 w-6" />,
    color: 'bg-green-500',
    overview: 'The Translation phase is where the original script is translated into the target language. Translators work from the source material to create accurate translations that maintain the original meaning and tone.',
    keyColumns: [
      { name: 'Translator', description: 'Guest assigned to translate the script' },
      { name: 'Guest Due Date', description: 'Deadline for translation delivery' },
      { name: 'Target Language', description: 'The language being translated to' },
      { name: 'Locked Runtime', description: 'Duration for timing reference' },
    ],
    workflow: [
      { step: 1, action: 'Assign Translator', detail: 'Select a translator from the guest roster' },
      { step: 2, action: 'Share Files', detail: 'Ensure translator has access to source materials' },
      { step: 3, action: 'Monitor Progress', detail: 'Track status updates from the translator' },
      { step: 4, action: 'Receive Delivery', detail: 'Translator uploads translated files and marks complete' },
      { step: 5, action: 'Review & Advance', detail: 'PM reviews delivery and moves to Adapting' },
    ],
    roles: [
      { role: 'Translator (Guest)', responsibility: 'Translates the script accurately within deadline' },
      { role: 'Project Manager', responsibility: 'Assigns translator, monitors progress, reviews delivery' },
    ],
    nextPhase: 'Adapting',
    triggerCondition: 'Translator sets status to "Done"',
  },
  adapting: {
    title: 'Adapting',
    icon: <Wand2 className="h-6 w-6" />,
    color: 'bg-amber-500',
    overview: 'The Adapting phase transforms the translated script into dialogue that fits lip-sync timing. Adapters adjust phrases to match mouth movements while preserving meaning and emotion.',
    keyColumns: [
      { name: 'Adapter', description: 'Guest assigned to adapt the translation' },
      { name: 'Guest Due Date', description: 'Deadline for adapted script' },
      { name: 'Voice Test', description: 'Whether voice tests are needed before recording' },
    ],
    workflow: [
      { step: 1, action: 'Assign Adapter', detail: 'Select an adapter familiar with lip-sync adaptation' },
      { step: 2, action: 'Provide Materials', detail: 'Share translated script and video reference' },
      { step: 3, action: 'Monitor Adaptation', detail: 'Track adapter progress and answer questions' },
      { step: 4, action: 'Receive Delivery', detail: 'Adapter uploads adapted script' },
      { step: 5, action: 'Determine Next Step', detail: 'If Voice Test = Yes → Voicetests, otherwise → Recording' },
    ],
    roles: [
      { role: 'Adapter (Guest)', responsibility: 'Creates lip-sync adapted dialogue' },
      { role: 'Project Manager', responsibility: 'Manages adapter, decides on voice test requirement' },
    ],
    nextPhase: 'Voicetests or Recording',
    triggerCondition: 'Adapter sets status to "Done" (skips to Recording if Voice Test ≠ Yes)',
  },
  voicetests: {
    title: 'Voice Tests',
    icon: <Mic className="h-6 w-6" />,
    color: 'bg-pink-500',
    overview: 'The Voice Tests phase is for casting approval. Sample recordings are created for client review before full production recording begins.',
    keyColumns: [
      { name: 'Director', description: 'Director overseeing voice test sessions' },
      { name: 'People', description: 'Team members involved in casting' },
      { name: 'Files', description: 'Voice test recordings for client review' },
    ],
    workflow: [
      { step: 1, action: 'Schedule Sessions', detail: 'Arrange voice test recording sessions' },
      { step: 2, action: 'Record Samples', detail: 'Capture voice samples for each character' },
      { step: 3, action: 'Upload Tests', detail: 'Add voice test files to the task' },
      { step: 4, action: 'Client Review', detail: 'Send to client for casting approval' },
      { step: 5, action: 'Advance', detail: 'Once approved, mark Done to move to Recording' },
    ],
    roles: [
      { role: 'Director', responsibility: 'Directs voice test sessions' },
      { role: 'Project Manager', responsibility: 'Coordinates with client on casting decisions' },
    ],
    nextPhase: 'Recording',
    triggerCondition: 'Status set to "Done"',
  },
  recording: {
    title: 'Recording',
    icon: <Mic className="h-6 w-6" />,
    color: 'bg-red-500',
    overview: 'The Recording phase is where all voice talent records their dialogue. Directors guide performances to match the original content\'s emotion and timing.',
    keyColumns: [
      { name: 'Director', description: 'Director overseeing recording sessions' },
      { name: 'Technician', description: 'Audio engineer managing the session' },
      { name: 'Studio', description: 'Which studio is assigned (2, 3, or 4)' },
      { name: 'Date Assigned', description: 'When recording was scheduled' },
    ],
    workflow: [
      { step: 1, action: 'Schedule Studio', detail: 'Book studio time and assign technician' },
      { step: 2, action: 'Prepare Materials', detail: 'Ensure adapted script and video are ready' },
      { step: 3, action: 'Direct Sessions', detail: 'Record all dialogue with director guidance' },
      { step: 4, action: 'Quality Check', detail: 'Review recordings for issues' },
      { step: 5, action: 'Complete', detail: 'Upload recorded files and mark Done to move to Premix' },
    ],
    roles: [
      { role: 'Director', responsibility: 'Directs voice performances' },
      { role: 'Technician', responsibility: 'Operates recording equipment, manages audio quality' },
      { role: 'Project Manager', responsibility: 'Schedules sessions, resolves issues' },
    ],
    nextPhase: 'Premix',
    triggerCondition: 'Status set to "Done"',
  },
  premix: {
    title: 'Premix',
    icon: <Headphones className="h-6 w-6" />,
    color: 'bg-indigo-500',
    overview: 'The Premix phase is the initial audio mixing stage where recorded dialogue is synchronized with the video and balanced with the original audio tracks.',
    keyColumns: [
      { name: 'Mixer Bogotá', description: 'Mixer assigned to this phase' },
      { name: 'Premix Retake List', description: 'Notes on what needs re-recording' },
    ],
    workflow: [
      { step: 1, action: 'Receive Recordings', detail: 'Get all recorded audio from Recording phase' },
      { step: 2, action: 'Initial Mix', detail: 'Sync dialogue and create preliminary mix' },
      { step: 3, action: 'Generate Retake List', detail: 'Identify lines that need re-recording' },
      { step: 4, action: 'Upload Premix', detail: 'Add premix files for QC review' },
      { step: 5, action: 'Complete', detail: 'Mark Done to advance to QC-Premix' },
    ],
    roles: [
      { role: 'Mixer Bogotá', responsibility: 'Creates the premix and identifies issues' },
      { role: 'Project Manager', responsibility: 'Reviews premix and retake list' },
    ],
    nextPhase: 'QC-Premix',
    triggerCondition: 'Status set to "Done"',
  },
  'qc-premix': {
    title: 'QC Premix',
    icon: <CheckCircle2 className="h-6 w-6" />,
    color: 'bg-cyan-500',
    overview: 'Quality Control for the premix. QC specialists review the premix for technical issues, timing problems, and audio quality before the retake phase.',
    keyColumns: [
      { name: 'QC 1', description: 'QC specialist assigned to review' },
      { name: 'Premix Retake List', description: 'List of issues found during QC' },
    ],
    workflow: [
      { step: 1, action: 'Review Premix', detail: 'Watch and listen to the full premix' },
      { step: 2, action: 'Document Issues', detail: 'Note timing, sync, or quality problems' },
      { step: 3, action: 'Update Retake List', detail: 'Add any new items to the retake list' },
      { step: 4, action: 'Approve or Flag', detail: 'Mark as approved or requiring fixes' },
      { step: 5, action: 'Advance', detail: 'Mark Done to move to Retakes' },
    ],
    roles: [
      { role: 'QC 1', responsibility: 'Reviews premix for quality and creates detailed notes' },
      { role: 'Project Manager', responsibility: 'Prioritizes fixes and communicates with team' },
    ],
    nextPhase: 'Retakes',
    triggerCondition: 'Status set to "Done"',
  },
  retakes: {
    title: 'Retakes',
    icon: <RefreshCw className="h-6 w-6" />,
    color: 'bg-orange-500',
    overview: 'The Retakes phase addresses all issues identified during QC. Voice talent re-records problematic lines and fixes are applied.',
    keyColumns: [
      { name: 'Director', description: 'Director for retake sessions' },
      { name: 'Premix Retake List', description: 'List of lines to re-record' },
      { name: 'Studio', description: 'Studio for retake sessions' },
    ],
    workflow: [
      { step: 1, action: 'Review Retake List', detail: 'Understand all required fixes' },
      { step: 2, action: 'Schedule Sessions', detail: 'Book talent and studio time' },
      { step: 3, action: 'Record Retakes', detail: 'Re-record all flagged lines' },
      { step: 4, action: 'Verify Quality', detail: 'Ensure retakes meet requirements' },
      { step: 5, action: 'Complete', detail: 'Mark Done to move to QC-Retakes' },
    ],
    roles: [
      { role: 'Director', responsibility: 'Directs retake sessions' },
      { role: 'Technician', responsibility: 'Records and exports retakes' },
    ],
    nextPhase: 'QC-Retakes',
    triggerCondition: 'Status set to "Done"',
  },
  'qc-retakes': {
    title: 'QC Retakes',
    icon: <ClipboardCheck className="h-6 w-6" />,
    color: 'bg-teal-500',
    overview: 'Quality Control for retakes. Verify that all re-recorded lines meet quality standards and no new issues were introduced.',
    keyColumns: [
      { name: 'QC Retakes', description: 'QC specialist reviewing retakes' },
    ],
    workflow: [
      { step: 1, action: 'Compare Retakes', detail: 'Review each retake against the original issue' },
      { step: 2, action: 'Verify Quality', detail: 'Ensure audio quality and sync are correct' },
      { step: 3, action: 'Approve Fixes', detail: 'Confirm all issues are resolved' },
      { step: 4, action: 'Flag Remaining', detail: 'Note any issues that persist' },
      { step: 5, action: 'Advance', detail: 'Mark Done to move to Mix' },
    ],
    roles: [
      { role: 'QC Retakes', responsibility: 'Verifies all retakes are acceptable' },
    ],
    nextPhase: 'Mix',
    triggerCondition: 'Status set to "Done"',
  },
  mix: {
    title: 'Mix',
    icon: <Settings className="h-6 w-6" />,
    color: 'bg-violet-500',
    overview: 'The final Mix phase creates the polished audio master. All dialogue, effects, and music are balanced to create the final deliverable.',
    keyColumns: [
      { name: 'Mixer Miami', description: 'Mixer creating the final mix' },
      { name: 'Mix Retake List', description: 'Any final adjustments needed' },
    ],
    workflow: [
      { step: 1, action: 'Integrate Retakes', detail: 'Add all approved retakes to the mix' },
      { step: 2, action: 'Final Balance', detail: 'Polish audio levels and timing' },
      { step: 3, action: 'Create Master', detail: 'Export the final mixed audio' },
      { step: 4, action: 'Upload Files', detail: 'Add final mix files to the task' },
      { step: 5, action: 'Complete', detail: 'Mark Done to move to QC-Mix' },
    ],
    roles: [
      { role: 'Mixer Miami', responsibility: 'Creates the final polished mix' },
      { role: 'Project Manager', responsibility: 'Reviews final mix quality' },
    ],
    nextPhase: 'QC-Mix',
    triggerCondition: 'Status set to "Done"',
  },
  'qc-mix': {
    title: 'QC Mix',
    icon: <CheckCircle2 className="h-6 w-6" />,
    color: 'bg-emerald-500',
    overview: 'Final Quality Control before delivery. The completed mix is reviewed for any remaining issues before client delivery.',
    keyColumns: [
      { name: 'QC Mix', description: 'QC specialist for final review' },
      { name: 'Mix Retake List', description: 'Any final fixes needed' },
    ],
    workflow: [
      { step: 1, action: 'Full Review', detail: 'Watch the entire episode with final mix' },
      { step: 2, action: 'Technical Check', detail: 'Verify audio specs meet requirements' },
      { step: 3, action: 'Client Standards', detail: 'Ensure delivery specs are met' },
      { step: 4, action: 'Approve or Fix', detail: 'Approve for delivery or request mix retakes' },
      { step: 5, action: 'Advance', detail: 'Mark Done to move to Mixretakes or Deliveries' },
    ],
    roles: [
      { role: 'QC Mix', responsibility: 'Final quality approval' },
      { role: 'Project Manager', responsibility: 'Coordinates with client on delivery' },
    ],
    nextPhase: 'Mixretakes or Deliveries',
    triggerCondition: 'Status set to "Done"',
  },
  mixretakes: {
    title: 'Mix Retakes',
    icon: <RefreshCw className="h-6 w-6" />,
    color: 'bg-rose-500',
    overview: 'Address any issues found during the final QC Mix phase. Make final adjustments to ensure the mix meets all requirements.',
    keyColumns: [
      { name: 'Mixer Miami', description: 'Mixer making final adjustments' },
      { name: 'Mix Retake List', description: 'Specific fixes required' },
    ],
    workflow: [
      { step: 1, action: 'Review Notes', detail: 'Understand required fixes from QC' },
      { step: 2, action: 'Apply Fixes', detail: 'Make necessary audio adjustments' },
      { step: 3, action: 'Re-export', detail: 'Create updated final mix' },
      { step: 4, action: 'Verify', detail: 'Confirm all issues are resolved' },
      { step: 5, action: 'Complete', detail: 'Mark Done to move to Deliveries' },
    ],
    roles: [
      { role: 'Mixer Miami', responsibility: 'Applies final corrections' },
    ],
    nextPhase: 'Deliveries',
    triggerCondition: 'Status set to "Done"',
  },
  deliveries: {
    title: 'Deliveries',
    icon: <Send className="h-6 w-6" />,
    color: 'bg-sky-500',
    overview: 'The final phase where completed content is packaged and delivered to the client. All final files are organized and sent per client specifications.',
    keyColumns: [
      { name: 'People', description: 'Team handling delivery' },
      { name: 'Entrega Cliente', description: 'Client delivery deadline' },
      { name: 'Final Deliverables', description: 'What files to deliver' },
    ],
    workflow: [
      { step: 1, action: 'Package Files', detail: 'Organize all final deliverables' },
      { step: 2, action: 'Format Check', detail: 'Verify files meet client specs' },
      { step: 3, action: 'Upload to Client', detail: 'Send files via client\'s preferred method' },
      { step: 4, action: 'Confirm Receipt', detail: 'Get client confirmation of delivery' },
      { step: 5, action: 'Close Project', detail: 'Mark status as Done to complete' },
    ],
    roles: [
      { role: 'People (Assigned)', responsibility: 'Packages and delivers final files' },
      { role: 'Project Manager', responsibility: 'Confirms client acceptance' },
    ],
    nextPhase: 'Complete',
    triggerCondition: 'Status set to "Done" - Project complete!',
  },
};

interface BoardGuideProps {
  boardName: string;
  isOpen: boolean;
  onClose: () => void;
}

function extractPhaseKey(boardName: string): string {
  // Extract phase from board name (e.g., "Mia-Translation" -> "translation")
  const parts = boardName.split('-');
  if (parts.length > 1) {
    return parts.slice(1).join('-').toLowerCase().replace(/\s+/g, '-');
  }
  return boardName.toLowerCase();
}

export function BoardGuide({ boardName, isOpen, onClose }: BoardGuideProps) {
  const phaseKey = extractPhaseKey(boardName);
  const guide = PHASE_GUIDES[phaseKey];

  if (!guide) {
    // HQ boards or unknown phases
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Board Overview</DialogTitle>
            <DialogDescription>
              This is a headquarters (HQ) board that aggregates all projects across phases.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              HQ boards provide a unified view of all projects in production. You can see every project 
              regardless of its current phase, making it easy to track overall progress and identify bottlenecks.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg text-white", guide.color)}>
              {guide.icon}
            </div>
            <div>
              <div className="text-xl">{guide.title} Phase</div>
              <div className="text-sm font-normal text-muted-foreground">
                Production Workflow Guide
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Overview */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Overview
              </h3>
              <p className="text-sm leading-relaxed">{guide.overview}</p>
            </section>

            {/* Key Columns */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Key Columns
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {guide.keyColumns.map((col) => (
                  <div key={col.name} className="bg-muted/50 rounded-lg p-3">
                    <div className="font-medium text-sm">{col.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{col.description}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Workflow Steps */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Workflow Steps
              </h3>
              <div className="space-y-3">
                {guide.workflow.map((step, idx) => (
                  <div key={step.step} className="flex gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium",
                      guide.color
                    )}>
                      {step.step}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="font-medium text-sm">{step.action}</div>
                      <div className="text-xs text-muted-foreground">{step.detail}</div>
                    </div>
                    {idx < guide.workflow.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50 mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Roles & Responsibilities */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Roles & Responsibilities
              </h3>
              <div className="space-y-2">
                {guide.roles.map((r) => (
                  <div key={r.role} className="flex gap-3 items-start">
                    <Badge variant="secondary" className="flex-shrink-0">{r.role}</Badge>
                    <span className="text-sm text-muted-foreground">{r.responsibility}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Next Phase */}
            <section className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Next Phase</div>
                  <div className="font-semibold flex items-center gap-2 mt-1">
                    {guide.nextPhase}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Trigger</div>
                  <div className="text-sm mt-1">{guide.triggerCondition}</div>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage first-time guide display
export function useBoardGuide(boardId: string, boardName: string) {
  const [isOpen, setIsOpen] = useState(false);
  const storageKey = `board-guide-seen-${boardId}`;

  useEffect(() => {
    // Check if user has seen this board's guide
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen && boardName) {
      // Auto-show on first visit (with small delay for page to load)
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [boardId, boardName, storageKey]);

  const openGuide = () => setIsOpen(true);
  
  const closeGuide = () => {
    setIsOpen(false);
    localStorage.setItem(storageKey, 'true');
  };

  return { isOpen, openGuide, closeGuide };
}
