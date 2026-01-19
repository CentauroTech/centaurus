import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';
import { toast } from 'sonner';

export interface TaskFileRecord {
  id: string;
  task_id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  file_category: string;
  phase: string | null;
  is_guest_accessible: boolean;
  uploaded_at: string;
  uploaded_by_id: string | null;
  uploaded_by?: {
    id: string;
    name: string;
    initials: string;
    color: string;
  } | null;
}

export function useTaskFiles(taskId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['task-files', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_files')
        .select(`
          id,
          task_id,
          name,
          url,
          type,
          size,
          file_category,
          phase,
          is_guest_accessible,
          uploaded_at,
          uploaded_by_id,
          uploaded_by:team_members!task_files_uploaded_by_id_fkey(id, name, initials, color)
        `)
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(file => ({
        ...file,
        uploaded_by: Array.isArray(file.uploaded_by) ? file.uploaded_by[0] : file.uploaded_by
      })) as TaskFileRecord[];
    },
    enabled: enabled && !!taskId,
  });
}

export function useUploadTaskFile(taskId: string) {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async ({ 
      file, 
      category = 'general', 
      phase = null,
      isGuestAccessible = false 
    }: { 
      file: File; 
      category?: string; 
      phase?: string | null;
      isGuestAccessible?: boolean;
    }) => {
      if (!currentMember) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('production-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('production-files')
        .getPublicUrl(fileName);

      // Create file record
      const { data, error } = await supabase
        .from('task_files')
        .insert({
          task_id: taskId,
          name: file.name,
          url: urlData.publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 
                file.type.startsWith('audio/') ? 'audio' :
                file.type.startsWith('video/') ? 'video' :
                file.type.includes('pdf') || file.type.includes('document') ? 'document' : 'other',
          size: file.size,
          file_category: category,
          phase: phase,
          is_guest_accessible: isGuestAccessible,
          uploaded_by_id: currentMember.id,
        })
        .select();

      if (error) throw error;
      return data?.[0] || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-files', taskId] });
      toast.success('File uploaded successfully');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    },
  });
}

export function useToggleFileAccessibility(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, isGuestAccessible }: { fileId: string; isGuestAccessible: boolean }) => {
      const { error } = await supabase
        .from('task_files')
        .update({ is_guest_accessible: isGuestAccessible })
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-files', taskId] });
    },
    onError: () => {
      toast.error('Failed to update file access');
    },
  });
}

export function useDeleteTaskFile(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      // Get file info first
      const { data: file, error: fetchError } = await supabase
        .from('task_files')
        .select('url')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // Extract storage path from URL
      const url = new URL(file.url);
      const pathMatch = url.pathname.match(/\/production-files\/(.+)$/);
      
      if (pathMatch) {
        // Delete from storage
        await supabase.storage
          .from('production-files')
          .remove([pathMatch[1]]);
      }

      // Delete record
      const { error } = await supabase
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-files', taskId] });
      toast.success('File deleted');
    },
    onError: () => {
      toast.error('Failed to delete file');
    },
  });
}

// File categories for categorization
export const FILE_CATEGORIES = [
  { value: 'source', label: 'Source Material' },
  { value: 'script', label: 'Script' },
  { value: 'translated', label: 'Translated' },
  { value: 'adapted', label: 'Adapted' },
  { value: 'retake_list', label: 'Retake List' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'general', label: 'General' },
] as const;

export type FileCategory = typeof FILE_CATEGORIES[number]['value'];
