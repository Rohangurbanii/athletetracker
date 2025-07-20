import { useState, useEffect, useCallback, useRef } from 'react';

// Custom hook for debounced API calls to prevent excessive requests
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Custom hook for optimized data fetching with caching
export const useOptimizedFetch = <T,>(
  key: string,
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  cacheTimeout: number = 5 * 60 * 1000 // 5 minutes default
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const lastFetchRef = useRef<string>('');

  const fetch = useCallback(async (forceRefresh = false) => {
    const cacheKey = key + JSON.stringify(dependencies);
    
    // Check if we should use cached data
    if (!forceRefresh && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      const now = Date.now();
      
      if (now - cached.timestamp < cacheTimeout) {
        setData(cached.data);
        return cached.data;
      }
    }

    // Prevent duplicate requests
    if (lastFetchRef.current === cacheKey && loading) {
      return data;
    }

    lastFetchRef.current = cacheKey;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      
      // Cache the result
      cacheRef.current.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
      lastFetchRef.current = '';
    }
  }, [key, fetchFn, dependencies, cacheTimeout, loading, data]);

  // Auto-fetch on dependency changes
  useEffect(() => {
    fetch();
  }, dependencies);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const refetch = useCallback(() => {
    return fetch(true);
  }, [fetch]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
};

// Custom hook for batch operations to reduce API calls
export const useBatchOperation = <T, R>(
  operation: (items: T[]) => Promise<R[]>,
  batchSize: number = 10,
  delay: number = 100
) => {
  const [queue, setQueue] = useState<T[]>([]);
  const [results, setResults] = useState<Map<string, R>>(new Map());
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const addToQueue = useCallback((item: T, key: string) => {
    setQueue(prev => [...prev, item]);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to process batch
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      
      try {
        const currentQueue = [...queue, item];
        const batchResults = await operation(currentQueue.slice(0, batchSize));
        
        setResults(prev => {
          const newResults = new Map(prev);
          batchResults.forEach((result, index) => {
            const itemKey = `${key}_${index}`;
            newResults.set(itemKey, result);
          });
          return newResults;
        });
        
        setQueue(prev => prev.slice(batchSize));
      } catch (error) {
        console.error('Batch operation failed:', error);
      } finally {
        setLoading(false);
      }
    }, delay);
  }, [operation, batchSize, delay, queue]);

  const getResult = useCallback((key: string) => {
    return results.get(key);
  }, [results]);

  return {
    addToQueue,
    getResult,
    loading,
    queueSize: queue.length
  };
};

export default {
  useDebounce,
  useOptimizedFetch,
  useBatchOperation
};