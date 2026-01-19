import ExpandableComment from "./ExpandableComment";

export default function CommentSection({ taskId }) {
  const comments = useTaskComments(taskId);

  return (
    <div className="flex flex-col gap-4 p-4">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-md border border-border p-3 bg-background">
          <div className="text-xs text-muted-foreground mb-1">
            {comment.author} · {comment.createdAt}
          </div>

          <ExpandableComment>{comment.body}</ExpandableComment>
        </div>
      ))}
    </div>
  );
}
