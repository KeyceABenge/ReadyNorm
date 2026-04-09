/**
 * Offline Banner
 * Shows a prominent banner when offline with sync status
 */

import { WifiOff, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import useOfflineStatus from './useOfflineStatus';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBanner() {
  const { isOffline, pendingCount, syncState } = useOfflineStatus();

  // Show syncing banner briefly
  const showSyncing = syncState.isSyncing;
  
  // Show success briefly after sync
  const showSuccess = !syncState.isSyncing && 
                      syncState.lastSyncResult?.synced > 0 &&
                      Date.now() - new Date(syncState.lastSyncTime).getTime() < 3000;

  if (!isOffline && !showSyncing && !showSuccess) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          "w-full px-4 py-2 text-center text-sm font-medium",
          isOffline && "bg-amber-500 text-white",
          showSyncing && !isOffline && "bg-blue-500 text-white",
          showSuccess && !isOffline && !showSyncing && "bg-emerald-500 text-white"
        )}
      >
        <div className="flex items-center justify-center gap-2">
          {isOffline && (
            <>
              <WifiOff className="w-4 h-4" />
              <span>
                You're offline — {pendingCount > 0 
                  ? `${pendingCount} change${pendingCount > 1 ? 's' : ''} will sync when connected`
                  : 'changes will sync when connected'
                }
              </span>
            </>
          )}
          
          {showSyncing && !isOffline && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                Syncing {syncState.progress?.current || 0} of {syncState.progress?.total || pendingCount} changes...
              </span>
            </>
          )}
          
          {showSuccess && !isOffline && !showSyncing && (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {syncState.lastSyncResult.synced} change{syncState.lastSyncResult.synced > 1 ? 's' : ''} synced successfully
              </span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}