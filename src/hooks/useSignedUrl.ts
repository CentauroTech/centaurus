import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get a signed URL for a file in the production-files bucket.
 * Falls back to the original URL if signing fails.
 */
export function useSignedUrl(originalUrl: string | undefined, expiresIn: number = 3600) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!originalUrl) {
      setSignedUrl(null);
      return;
    }

    const getSignedUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Extract storage path from URL
        const url = new URL(originalUrl);
        const pathMatch = url.pathname.match(/\/production-files\/(.+)$/);
        
        if (!pathMatch) {
          // Not a production-files URL, use original
          setSignedUrl(originalUrl);
          return;
        }

        const filePath = decodeURIComponent(pathMatch[1]);
        
        const { data, error: signError } = await supabase.storage
          .from('production-files')
          .createSignedUrl(filePath, expiresIn);

        if (signError) {
          console.error('Failed to create signed URL:', signError);
          // Fall back to original URL
          setSignedUrl(originalUrl);
          return;
        }

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(err as Error);
        setSignedUrl(originalUrl);
      } finally {
        setIsLoading(false);
      }
    };

    getSignedUrl();
  }, [originalUrl, expiresIn]);

  return { signedUrl, isLoading, error };
}

/**
 * Utility function to get a signed URL for a file.
 * Returns a promise that resolves to the signed URL or original URL on failure.
 */
export async function getSignedFileUrl(originalUrl: string, expiresIn: number = 3600): Promise<string> {
  try {
    const url = new URL(originalUrl);
    const pathMatch = url.pathname.match(/\/production-files\/(.+)$/);
    
    if (!pathMatch) {
      return originalUrl;
    }

    const filePath = decodeURIComponent(pathMatch[1]);
    
    const { data, error } = await supabase.storage
      .from('production-files')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Failed to create signed URL:', error);
      return originalUrl;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return originalUrl;
  }
}
