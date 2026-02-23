import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  rollbackOnError?: boolean;
}

export function useOptimisticUpdate<T>(
  updateFn: (data: T) => Promise<T>,
  options: OptimisticUpdateOptions<T> = {}
) {
  const [isUpdating, setIsUpdating] = useState(false);
  const previousStateRef = useRef<T | null>(null);
  const { toast } = useToast();

  const execute = useCallback(
    async (optimisticData: T, actualData?: T) => {
      // Store previous state for rollback
      previousStateRef.current = optimisticData;

      // Immediately update UI optimistically
      if (options.onSuccess) {
        options.onSuccess(optimisticData);
      }

      setIsUpdating(true);

      try {
        // Perform actual update
        const result = actualData ? await updateFn(actualData) : await updateFn(optimisticData);

        if (options.successMessage) {
          toast({
            title: 'Success',
            description: options.successMessage,
          });
        }

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (error) {
        // Rollback on error if enabled
        if (options.rollbackOnError !== false && previousStateRef.current) {
          if (options.onSuccess) {
            options.onSuccess(previousStateRef.current);
          }
        }

        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        
        toast({
          title: 'Error',
          description: options.errorMessage || errorMessage,
          variant: 'destructive',
        });

        if (options.onError) {
          options.onError(error instanceof Error ? error : new Error(errorMessage));
        }

        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [updateFn, options, toast]
  );

  return { execute, isUpdating };
}

