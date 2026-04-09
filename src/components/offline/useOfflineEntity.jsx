/**
 * useOfflineEntity Hook
 * Wraps entity operations to work seamlessly offline
 */

import { useCallback, useEffect, useState } from 'react';
import { getRepository } from '@/lib/adapters/database';
import { useQueryClient } from '@tanstack/react-query';
import { 
  queueOfflineAction, 
  getCachedData, 
  cacheEntityData 
} from './OfflineStorageService';

export function useOfflineEntity(entityName, options = {}) {
  const { organizationId, queryKey } = options;
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Create with offline support
  const create = useCallback(async (data) => {
    const entityAPI = getRepository(entityName);
    
    // Add metadata
    const enrichedData = {
      ...data,
      organization_id: data.organization_id || organizationId,
      _created_offline: !isOnline,
      _offline_created_at: new Date().toISOString()
    };

    if (isOnline) {
      try {
        const result = await entityAPI.create(enrichedData);
        return result;
      } catch (error) {
        // If network fails, fall through to offline queue
        if (!navigator.onLine) {
          console.log('Network failed, queuing offline');
        } else {
          throw error;
        }
      }
    }

    // Queue for offline sync
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineRecord = {
      ...enrichedData,
      id: tempId,
      _is_temp: true,
      created_date: new Date().toISOString()
    };

    await queueOfflineAction({
      entity: entityName,
      operation: 'create',
      data: enrichedData,
      tempId
    });

    // Optimistically update cache
    if (queryKey) {
      queryClient.setQueryData(queryKey, (old) => {
        if (Array.isArray(old)) {
          return [...old, offlineRecord];
        }
        return old;
      });
    }

    return offlineRecord;
  }, [entityName, isOnline, organizationId, queryClient, queryKey]);

  // Update with offline support
  const update = useCallback(async (entityId, data) => {
    const entityAPI = getRepository(entityName);
    
    const enrichedData = {
      ...data,
      _updated_offline: !isOnline,
      _offline_updated_at: new Date().toISOString()
    };

    if (isOnline) {
      try {
        const result = await entityAPI.update(entityId, enrichedData);
        return result;
      } catch (error) {
        if (!navigator.onLine) {
          console.log('Network failed, queuing offline');
        } else {
          throw error;
        }
      }
    }

    // Queue for offline sync
    await queueOfflineAction({
      entity: entityName,
      operation: 'update',
      entityId,
      data: enrichedData
    });

    // Optimistically update cache
    if (queryKey) {
      queryClient.setQueryData(queryKey, (old) => {
        if (Array.isArray(old)) {
          return old.map(item => 
            item.id === entityId 
              ? { ...item, ...enrichedData, _pending_sync: true }
              : item
          );
        }
        return old;
      });
    }

    return { id: entityId, ...enrichedData, _pending_sync: true };
  }, [entityName, isOnline, queryClient, queryKey]);

  // Fetch with cache fallback
  const fetchWithCache = useCallback(async (filterFn, cacheKey = 'default') => {
    const entityAPI = getRepository(entityName);
    
    try {
      if (isOnline) {
        const data = await filterFn(entityAPI);
        // Cache the result for offline use
        await cacheEntityData(entityName, data, cacheKey);
        return { data, fromCache: false };
      }
    } catch (error) {
      if (navigator.onLine) {
        throw error;
      }
    }

    // Offline - try to get from cache
    const cached = await getCachedData(entityName, cacheKey);
    if (cached) {
      return { 
        data: cached.data, 
        fromCache: true, 
        cachedAt: cached.lastUpdated 
      };
    }

    return { data: [], fromCache: true, cachedAt: null };
  }, [entityName, isOnline]);

  return {
    create,
    update,
    fetchWithCache,
    isOnline
  };
}

export default useOfflineEntity;