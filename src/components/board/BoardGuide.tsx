import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Rocket, FileText, Languages, Mic, Headphones, CheckCircle2, 
  Wand2, Send, Users, ClipboardCheck, ArrowRight,
  Settings, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHASE_GUIDES, type PhaseGuide } from '@/config/phaseGuides';

// Icon mapping
const PHASE_ICONS: Record<string, React.ReactNode> = {
  kickoff: <Rocket className="h-6 w-6" />,
  assets: <FileText className="h-6 w-6" />,
  translation: <Languages className="h-6 w-6" />,
  adapting: <Wand2 className="h-6 w-6" />,
  voicetests: <Mic className="h-6 w-6" />,
  recording: <Mic className="h-6 w-6" />,
  premix: <Headphones className="h-6 w-6" />,
  'qc-premix': <CheckCircle2 className="h-6 w-6" />,
  retakes: <RefreshCw className="h-6 w-6" />,
  'qc-retakes': <ClipboardCheck className="h-6 w-6" />,
  mix: <Settings className="h-6 w-6" />,
  'qc-mix': <CheckCircle2 className="h-6 w-6" />,
  mixretakes: <RefreshCw className="h-6 w-6" />,
  deliveries: <Send className="h-6 w-6" />,
};

interface BoardGuideProps {
  boardName: string;
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
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
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const phaseKey = extractPhaseKey(boardName);
  const guide = PHASE_GUIDES[phaseKey];
  const icon = PHASE_ICONS[phaseKey];

  const handleClose = () => {
    onClose(dontShowAgain);
    setDontShowAgain(false); // Reset for next time
  };

  if (!guide) {
    // HQ boards or unknown phases
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
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
          <DialogFooter className="flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="dont-show-hq" 
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <Label htmlFor="dont-show-hq" className="text-sm text-muted-foreground cursor-pointer">
                Don't show this again
              </Label>
            </div>
            <Button onClick={handleClose}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg text-white", guide.color)}>
              {icon}
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

        <DialogFooter className="flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="dont-show-again" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label htmlFor="dont-show-again" className="text-sm text-muted-foreground cursor-pointer">
              Don't show this again
            </Label>
          </div>
          <Button onClick={handleClose}>Got it</Button>
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
  
  const closeGuide = (dontShowAgain: boolean = false) => {
    setIsOpen(false);
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
  };

  const resetGuide = () => {
    localStorage.removeItem(storageKey);
  };

  return { isOpen, openGuide, closeGuide, resetGuide };
}
