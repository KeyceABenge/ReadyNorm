/**
 * Offline Storage Service
 * Manages IndexedDB for offline data persistence
 */

const DB_NAME = 'sanitation_offline_db';
const DB_VERSION = 1;

const STORES = {
  PENDING_ACTIONS: 'pending_actions',
  CACHED_DATA: 'cached_data',
  SYNC_STATUS: 'sync_status'
};

let db = null;

// Initialize IndexedDB
export const initOfflineDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store for pending offline actions
      if (!database.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
        const actionStore = database.createObjectStore(STORES.PENDING_ACTIONS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        actionStore.createIndex('entity', 'entity', { unique: false });
        actionStore.createIndex('timestamp', 'timestamp', { unique: false });
        actionStore.createIndex('status', 'status', { unique: false });
      }

      // Store for cached entity data
      if (!database.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const cacheStore = database.createObjectStore(STORES.CACHED_DATA, { 
          keyPath: 'cacheKey' 
        });
        cacheStore.createIndex('entity', 'entity', { unique: false });
        cacheStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      // Store for sync status tracking
      if (!database.objectStoreNames.contains(STORES.SYNC_STATUS)) {
        database.createObjectStore(STORES.SYNC_STATUS, { keyPath: 'key' });
      }
    };
  });
};

// Get database instance
const getDB = async () => {
  if (!db) {
    await initOfflineDB();
  }
  return db;
};

// Queue an offline action
export const queueOfflineAction = async (action) => {
  const database = await getDB();
  
  const offlineAction = {
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    localTimestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
    isOffline: true
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_ACTIONS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_ACTIONS);
    const request = store.add(offlineAction);

    request.onsuccess = () => resolve(offlineAction);
    request.onerror = () => reject(request.error);
  });
};

// Get all pending actions
export const getPendingActions = async () => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_ACTIONS], 'readonly');
    const store = transaction.objectStore(STORES.PENDING_ACTIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      const actions = request.result.filter(a => a.status === 'pending' || a.status === 'failed');
      resolve(actions.sort((a, b) => a.localTimestamp - b.localTimestamp));
    };
    request.onerror = () => reject(request.error);
  });
};

// Update action status
export const updateActionStatus = async (actionId, status, error = null) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_ACTIONS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_ACTIONS);
    const getRequest = store.get(actionId);

    getRequest.onsuccess = () => {
      const action = getRequest.result;
      if (action) {
        action.status = status;
        action.lastError = error;
        action.lastAttempt = new Date().toISOString();
        if (status === 'failed') {
          action.retryCount = (action.retryCount || 0) + 1;
        }
        if (status === 'synced') {
          action.syncedAt = new Date().toISOString();
        }
        const putRequest = store.put(action);
        putRequest.onsuccess = () => resolve(action);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Remove synced actions older than 24 hours
export const cleanupSyncedActions = async () => {
  const database = await getDB();
  const cutoff = Date.now() - (24 * 60 * 60 * 1000);
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_ACTIONS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_ACTIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      const toDelete = request.result.filter(a => 
        a.status === 'synced' && a.localTimestamp < cutoff
      );
      toDelete.forEach(action => store.delete(action.id));
      resolve(toDelete.length);
    };
    request.onerror = () => reject(request.error);
  });
};

// Cache entity data for offline access
export const cacheEntityData = async (entity, data, queryKey = 'default') => {
  const database = await getDB();
  const cacheKey = `${entity}_${queryKey}`;
  
  const cacheEntry = {
    cacheKey,
    entity,
    queryKey,
    data,
    lastUpdated: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHED_DATA], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_DATA);
    const request = store.put(cacheEntry);

    request.onsuccess = () => resolve(cacheEntry);
    request.onerror = () => reject(request.error);
  });
};

// Get cached entity data
export const getCachedData = async (entity, queryKey = 'default') => {
  const database = await getDB();
  const cacheKey = `${entity}_${queryKey}`;
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHED_DATA], 'readonly');
    const store = transaction.objectStore(STORES.CACHED_DATA);
    const request = store.get(cacheKey);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get pending action count
export const getPendingActionCount = async () => {
  const actions = await getPendingActions();
  return actions.length;
};

// Check if there are conflicts for an entity
export const checkForConflicts = async (entityName, entityId) => {
  const actions = await getPendingActions();
  return actions.filter(a => 
    a.entity === entityName && 
    a.entityId === entityId
  );
};

// Export for debugging
export const exportOfflineData = async () => {
  const database = await getDB();
  
  return new Promise((resolve) => {
    const result = { pendingActions: [], cachedData: [] };
    
    const transaction = database.transaction([STORES.PENDING_ACTIONS, STORES.CACHED_DATA], 'readonly');
    
    transaction.objectStore(STORES.PENDING_ACTIONS).getAll().onsuccess = (e) => {
      result.pendingActions = e.target.result;
    };
    
    transaction.objectStore(STORES.CACHED_DATA).getAll().onsuccess = (e) => {
      result.cachedData = e.target.result;
    };
    
    transaction.oncomplete = () => resolve(result);
  });
};