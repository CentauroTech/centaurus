-- Add ON DELETE CASCADE to all foreign keys referencing tasks.id
-- This ensures deleting a task also removes related records

-- activity_log
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_task_id_fkey;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- task_people
ALTER TABLE public.task_people DROP CONSTRAINT IF EXISTS task_people_task_id_fkey;
ALTER TABLE public.task_people ADD CONSTRAINT task_people_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- task_viewers
ALTER TABLE public.task_viewers DROP CONSTRAINT IF EXISTS task_viewers_task_id_fkey;
ALTER TABLE public.task_viewers ADD CONSTRAINT task_viewers_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- comments
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_task_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- task_files
ALTER TABLE public.task_files DROP CONSTRAINT IF EXISTS task_files_task_id_fkey;
ALTER TABLE public.task_files ADD CONSTRAINT task_files_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_task_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- guest_completed_tasks
ALTER TABLE public.guest_completed_tasks DROP CONSTRAINT IF EXISTS guest_completed_tasks_task_id_fkey;
ALTER TABLE public.guest_completed_tasks ADD CONSTRAINT guest_completed_tasks_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- comment_mentions (cascade from comments, which cascades from tasks)
ALTER TABLE public.comment_mentions DROP CONSTRAINT IF EXISTS comment_mentions_comment_id_fkey;
ALTER TABLE public.comment_mentions ADD CONSTRAINT comment_mentions_comment_id_fkey
  FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;

-- comment_likes (cascade from comments)
ALTER TABLE public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_comment_id_fkey;
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_comment_id_fkey
  FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;

-- comment_attachments (cascade from comments)
ALTER TABLE public.comment_attachments DROP CONSTRAINT IF EXISTS comment_attachments_comment_id_fkey;
ALTER TABLE public.comment_attachments ADD CONSTRAINT comment_attachments_comment_id_fkey
  FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;