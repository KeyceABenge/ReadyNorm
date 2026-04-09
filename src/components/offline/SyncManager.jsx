/**
 * Sync Manager
 * Handles synchronization of offline actions when connectivity is restored
 */

import { getRepository } from '@/lib/adapters/database';
import { 
  getPendingActions, 
  updateActionStatus, 
  cleanupSyncedActions,
  getPendingActionCount
} from './OfflineStorageService';

let syncInProgress = false;
let syncListeners = [];

// Subscribe to sync events
export const subscribeSyncEvents = (callback) => {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
};

// Notify all listeners
const notifySyncEvent = (event) => {
  syncListeners.forEach(cb => cb(event));
};

// Execute a single offline action
const executeAction = async (action) => {
  const { entity, operation, data, entityId } = action;
  
  // Get the entity repository from database adapter
  const entityAPI = getRepository(entity);

  // Preserve offline timestamp in the data
  const dataWithMeta = {
    ...data,
    _offline_timestamp: action.timestamp,
    _synced_at: new Date().toISOString(),
    _was_offline: true
  };

  switch (operation) {
    case 'create':
      return await entityAPI.create(dataWithMeta);
    
    case 'update':
      if (!entityId) throw new Error('entityId required for update');
      return await entityAPI.update(entityId, dataWithMeta);
    
    case 'delete':
      if (!entityId) throw new Error('entityId required for delete');
      return await entityAPI.delete(entityId);
    
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
};

// Sync all pending actions
export const syncPendingActions = async (options = {}) => {
  if (syncInProgress) {
    console.log('Sync already in progress');
    return { skipped: true };
  }

  syncInProgress = true;
  notifySyncEvent({ type: 'sync_started' });

  const results = {
    total: 0,
    synced: 0,
    failed: 0,
    conflicts: 0,
    errors: []
  };

  try {
    const pendingActions = await getPendingActions();
    results.total = pendingActions.length;

    if (pendingActions.length === 0) {
      notifySyncEvent({ type: 'sync_complete', results });
      return results;
    }

    notifySyncEvent({ 
      type: 'sync_progress', 
      total: pendingActions.length, 
      current: 0 
    });

    // Process actions in order (FIFO)
    for (let i = 0; i < pendingActions.length; i++) {
      const action = pendingActions[i];
      
      notifySyncEvent({ 
        type: 'sync_progress', 
        total: pendingActions.length, 
        current: i + 1,
        action: action
      });

      try {
        // Check if we should skip (too many retries)
        if (action.retryCount >= 3) {
          results.failed++;
          results.errors.push({
            actionId: action.id,
            error: 'Max retries exceeded',
            action
          });
          continue;
        }

        // Execute the action
        await executeAction(action);
        await updateActionStatus(action.id, 'synced');
        results.synced++;

      } catch (error) {
        console.error('Sync error for action:', action.id, error);
        
        // Check for conflict (409) or other errors
        const isConflict = error?.status === 409 || 
                          error?.message?.includes('conflict');
        
        if (isConflict) {
          results.conflicts++;
          await updateActionStatus(action.id, 'conflict', error.message);
        } else {
          results.failed++;
          await updateActionStatus(action.id, 'failed', error.message);
        }

        results.errors.push({
          actionId: action.id,
          error: error.message,
          isConflict,
          action
        });
      }
    }

    // Cleanup old synced actions
    await cleanupSyncedActions();

    notifySyncEvent({ type: 'sync_complete', results });
    return results;

  } catch (error) {
    console.error('Sync failed:', error);
    notifySyncEvent({ type: 'sync_error', error: error.message });
    throw error;

  } finally {
    syncInProgress = false;
  }
};

// Check if sync is needed
export const isSyncNeeded = async () => {
  const count = await getPendingActionCount();
  return count > 0;
};

// Get sync status
export const getSyncStatus = async () => {
  const pendingActions = await getPendingActions();
  const pending = pendingActions.filter(a => a.status === 'pending').length;
  const failed = pendingActions.filter(a => a.status === 'failed').length;
  const conflicts = pendingActions.filter(a => a.status === 'conflict').length;

  return {
    hasPending: pending > 0,
    pendingCount: pending,
    failedCount: failed,
    conflictCount: conflicts,
    totalPending: pending + failed,
    actions: pendingActions
  };
};

// Manual retry of failed actions
export const retryFailedActions = async () => {
  const pendingActions = await getPendingActions();
  const failed = pendingActions.filter(a => a.status === 'failed');
  
  // Reset retry count and status for failed actions
  for (const action of failed) {
    await updateActionStatus(action.id, 'pending');
  }
  
  // Trigger sync
  return await syncPendingActions();
};

// Resolve conflict by keeping local or server version
export const resolveConflict = async (actionId, resolution) => {
  if (resolution === 'discard_local') {
    await updateActionStatus(actionId, 'discarded');
  } else if (resolution === 'retry') {
    await updateActionStatus(actionId, 'pending');
    await syncPendingActions();
  }
};