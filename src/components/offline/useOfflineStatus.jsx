/**
 * useOfflineStatus Hook
 * Provides real-time online/offline status and sync state
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  initOfflineDB, 
  getPendingActionCount,
  queueOfflineAction as queueAction
} from './OfflineStorageService';
import { 
  syncPendingActions, 
  subscribeSyncEvents,
  getSyncStatus,
  isSyncNeeded
} from './SyncManager';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    lastSyncTime: null,
    lastSyncResult: null,
    error: null
  });

  // Initialize IndexedDB
  useEffect(() => {
    const init = async () => {
      try {
        await initOfflineDB();
        const count = await getPendingActionCount();
        setPendingCount(count);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize offline DB:', error);
        setIsInitialized(true); // Continue anyway
      }
    };
    init();
  }, []);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      // Auto-sync when coming back online
      const needsSync = await isSyncNeeded();
      if (needsSync) {
        try {
          await syncPendingActions();
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to sync events
  useEffect(() => {
    const unsubscribe = subscribeSyncEvents(async (event) => {
      switch (event.type) {
        case 'sync_started':
          setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));
          break;
        
        case 'sync_progress':
          setSyncState(prev => ({ 
            ...prev, 
            progress: { current: event.current, total: event.total }
          }));
          break;
        
        case 'sync_complete':
          setSyncState(prev => ({
            ...prev,
            isSyncing: false,
            lastSyncTime: new Date().toISOString(),
            lastSyncResult: event.results,
            progress: null
          }));
          // Update pending count after sync
          const count = await getPendingActionCount();
          setPendingCount(count);
          break;
        
        case 'sync_error':
          setSyncState(prev => ({
            ...prev,
            isSyncing: false,
            error: event.error
          }));
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Queue an action (works offline)
  const queueOfflineAction = useCallback(async (action) => {
    const result = await queueAction(action);
    const count = await getPendingActionCount();
    setPendingCount(count);
    
    // If online, try to sync immediately
    if (navigator.onLine) {
      try {
        await syncPendingActions();
      } catch (error) {
        // Silent fail - will retry later
      }
    }
    
    return result;
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) {
      return { error: 'Currently offline' };
    }
    return await syncPendingActions();
  }, []);

  // Get detailed sync status
  const getDetailedStatus = useCallback(async () => {
    return await getSyncStatus();
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    isInitialized,
    pendingCount,
    hasPendingActions: pendingCount > 0,
    syncState,
    queueOfflineAction,
    triggerSync,
    getDetailedStatus
  };
}

export default useOfflineStatus;