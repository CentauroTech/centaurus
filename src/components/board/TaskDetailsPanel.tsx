import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CommentSection from "./CommentSection";

export default function TaskDetailsPanel({ task }) {
  return (
    <Sheet open onOpenChange={(open) => !open && handlePanelClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-lg font-semibold truncate">{task.name}</SheetTitle>
        </SheetHeader>

        {/* Tabs wrapper */}
        <Tabs defaultValue="updates" className="flex-1 flex flex-col min-h-0">
          <TabsList className="h-12 px-4 border-b border-border shrink-0">
            <TabsTrigger value="updates">Updates</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="kickoff">Kickoff</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* THIS is the key fix */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TabsContent value="updates" className="h-full">
              <CommentSection taskId={task.id} />
            </TabsContent>

            <TabsContent value="kickoff" className="h-full p-4">
              <div className="whitespace-pre-wrap leading-relaxed text-sm">{task.kickoffMessage}</div>
            </TabsContent>

            <TabsContent value="files" className="h-full p-4">
              <FilesTab taskId={task.id} />
            </TabsContent>

            <TabsContent value="activity" className="h-full p-4">
              <ActivityLog taskId={task.id} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
