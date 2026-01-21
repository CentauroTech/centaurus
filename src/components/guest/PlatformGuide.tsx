import { useState } from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  CheckCircle2, 
  FileText, 
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Upload,
  Bell,
  ArrowRight,
  Circle,
  PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PlatformGuideProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface GuideStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: React.ReactNode;
}

export function PlatformGuide({ onComplete, onSkip }: PlatformGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: GuideStep[] = [
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      icon: <LayoutDashboard className="h-6 w-6" />,
      description: 'Overview of your workspace',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Welcome to your Guest Portal! Here's what you'll find on your dashboard:
          </p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Active Tasks</p>
                <p className="text-sm text-muted-foreground">Tasks assigned to you that need your attention</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <Bell className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium">Delayed Tasks</p>
                <p className="text-sm text-muted-foreground">Overdue items that need immediate action</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Completed Tasks</p>
                <p className="text-sm text-muted-foreground">Your finished work, ready for invoicing</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Use the toggle to switch between <strong>Table</strong> and <strong>Card</strong> views based on your preference.
          </p>
        </div>
      ),
    },
    {
      id: 'tasks',
      title: 'Understanding Your Tasks',
      icon: <ListTodo className="h-6 w-6" />,
      description: 'Task statuses and information',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Each task shows important project information and has a status:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Badge variant="secondary" className="bg-muted">
                <Circle className="h-3 w-3 mr-1" />
                Not Started
              </Badge>
              <span className="text-sm">Task assigned but not yet begun</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Badge className="bg-blue-500">
                <PlayCircle className="h-3 w-3 mr-1" />
                Working
              </Badge>
              <span className="text-sm">You're actively working on this task</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Badge className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Done
              </Badge>
              <span className="text-sm">Completed and delivered</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm">
              <strong>Tip:</strong> Tasks with past due dates will show in <span className="text-red-500 font-medium">red</span> - prioritize these!
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Key information shown: <strong>WO#</strong> (Work Order), <strong>Phase</strong>, <strong>Runtime</strong>, and <strong>Due Date</strong>.
          </p>
        </div>
      ),
    },
    {
      id: 'completing',
      title: 'Completing a Task',
      icon: <CheckCircle2 className="h-6 w-6" />,
      description: 'Step-by-step completion process',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Follow these steps to complete your tasks:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">1</div>
              <div>
                <p className="font-medium">Open Task Details</p>
                <p className="text-sm text-muted-foreground">Click on any task to see full project information and files</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">2</div>
              <div>
                <p className="font-medium">Update Status to "Working"</p>
                <p className="text-sm text-muted-foreground">Let the team know you've started working on the task</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">3</div>
              <div>
                <p className="font-medium">Click "Done" When Finished</p>
                <p className="text-sm text-muted-foreground">This opens the completion dialog</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">4</div>
              <div className="flex items-start gap-2">
                <div>
                  <p className="font-medium">Upload Completed File</p>
                  <p className="text-sm text-muted-foreground">Your file is automatically categorized by phase</p>
                </div>
                <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">5</div>
              <div>
                <p className="font-medium">Add Delivery Notes (Optional)</p>
                <p className="text-sm text-muted-foreground">Include any relevant comments about your work</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'history',
      title: 'Your Completion History',
      icon: <FileText className="h-6 w-6" />,
      description: 'Track your completed work',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            All completed tasks are permanently recorded in your history:
          </p>
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">WO#</p>
                <p className="text-xs text-muted-foreground">Work Order</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">Phase</p>
                <p className="text-xs text-muted-foreground">Task Type</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">Role</p>
                <p className="text-xs text-muted-foreground">Your Position</p>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground">
            Find your history in the <strong>"Completed"</strong> tab. This includes:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Project name and work order number</li>
            <li>Phase and role you performed</li>
            <li>Runtime information</li>
            <li>Your delivered file (downloadable)</li>
            <li>Completion date</li>
          </ul>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm">
              <strong>This is your proof of work!</strong> Use this for creating invoices.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'invoicing',
      title: 'Creating Invoices',
      icon: <FileText className="h-6 w-6" />,
      description: 'Bill for your completed work',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Create professional invoices directly from the portal:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm">Go to the <strong>"Invoices"</strong> tab</p>
            </div>
            <div className="flex gap-3">
              <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm">Click <strong>"Create Invoice"</strong></p>
            </div>
            <div className="flex gap-3">
              <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm">Select completed tasks to include (details are pre-filled)</p>
            </div>
            <div className="flex gap-3">
              <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm">Add your rates/prices for each item</p>
            </div>
            <div className="flex gap-3">
              <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm">Review billing info (from your profile)</p>
            </div>
            <div className="flex gap-3">
              <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm"><strong>Save as Draft</strong> or <strong>Submit</strong> for approval</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm">
              <strong>Important:</strong> Once you submit your first invoice, your billing profile will be locked to ensure consistency across all invoices.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'communication',
      title: 'Communication & Notifications',
      icon: <MessageCircle className="h-6 w-6" />,
      description: 'Stay connected with the team',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Multiple ways to communicate with the production team:
          </p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <MessageCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Task Comments</p>
                <p className="text-sm text-muted-foreground">
                  Use the Communication tab in task details. Use <strong>@mentions</strong> to notify specific team members.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Bell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Notification Bell</p>
                <p className="text-sm text-muted-foreground">
                  Check the bell icon for updates, mentions, and task assignments.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <MessageCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Direct Messages</p>
                <p className="text-sm text-muted-foreground">
                  Use the chat widget (bottom-right corner) for direct conversations.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/10 to-transparent">
            <p className="font-medium mb-1">You're all set! 🎉</p>
            <p className="text-sm text-muted-foreground">
              Click "Get Started" to access your dashboard and begin working on your tasks.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  const goToNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Step {currentStep + 1} of {steps.length}</span>
          <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(index)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all",
              index === currentStep
                ? "bg-primary text-primary-foreground scale-110"
                : index < currentStep
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {step.icon}
          </button>
        ))}
      </div>

      {/* Current step content */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {steps[currentStep].icon}
            </div>
            {steps[currentStep].title}
          </CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {steps[currentStep].content}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={goToPrev}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip Guide
            </Button>
          )}
          <Button onClick={goToNext}>
            {isLastStep ? 'Get Started' : 'Next'}
            {!isLastStep && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
