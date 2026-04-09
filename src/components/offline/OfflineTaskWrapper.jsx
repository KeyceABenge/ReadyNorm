/**
 * Offline Task Wrapper
 * Wraps task completion forms to work offline
 */

import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { CloudOff, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import useOfflineStatus from './useOfflineStatus';
import { format } from 'date-fns';

export function OfflineTaskBadge({ task }) {
  if (!task?._pending_sync && !task?._is_temp && !task?._was_offline) {
    return null;
  }

  if (task._pending_sync || task._is_temp) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <CloudOff className="w-3 h-3" />
        Pending Sync
      </Badge>
    );
  }

  if (task._was_offline) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
        <Clock className="w-3 h-3" />
        Synced from offline
      </Badge>
    );
  }

  return null;
}

export function OfflineCompletionWrapper({ 
  children, 
  onComplete, 
  task,
  className 
}) {
  const { isOffline, queueOfflineAction } = useOfflineStatus();
  const [offlineStatus, setOfflineStatus] = useState(null);

  const handleOfflineComplete = async (completionData) => {
    if (isOffline) {
      // Queue the completion for later sync
      const timestamp = new Date().toISOString();
      
      await queueOfflineAction({
        entity: 'Task',
        operation: 'update',
        entityId: task.id,
        data: {
          ...completionData,
          status: 'completed',
          completed_at: timestamp,
          _completed_offline: true,
          _offline_completed_at: timestamp
        }
      });

      setOfflineStatus({
        type: 'queued',
        timestamp,
        message: 'Completion saved offline'
      });

      // Still call the original onComplete for UI updates
      if (onComplete) {
        onComplete({
          ...completionData,
          _pending_sync: true,
          _offline_timestamp: timestamp
        });
      }

      return;
    }

    // Online - proceed normally
    if (onComplete) {
      onComplete(completionData);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Offline indicator */}
      {isOffline && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
          <CloudOff className="w-4 h-4 flex-shrink-0" />
          <span>You're offline. Your completion will be saved and synced when connected.</span>
        </div>
      )}

      {/* Success message after offline queue */}
      {offlineStatus?.type === 'queued' && (
        <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>
            Saved at {format(new Date(offlineStatus.timestamp), 'h:mm a')} — will sync when online
          </span>
        </div>
      )}

      {/* Render children with modified onComplete */}
      {typeof children === 'function' 
        ? children({ onComplete: handleOfflineComplete, isOffline })
        : children
      }
    </div>
  );
}

export function TaskSyncStatus({ task }) {
  if (!task) return null;

  const hasOfflineData = task._completed_offline || task._updated_offline || task._pending_sync;
  
  if (!hasOfflineData) return null;

  return (
    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
      {task._pending_sync ? (
        <>
          <CloudOff className="w-3 h-3 text-amber-500" />
          <span>Pending sync</span>
        </>
      ) : task._completed_offline ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-blue-500" />
          <span>
            Completed offline at {format(new Date(task._offline_completed_at), 'h:mm a')}
            {task._synced_at && ` • Synced at ${format(new Date(task._synced_at), 'h:mm a')}`}
          </span>
        </>
      ) : null}
    </div>
  );
}

export default OfflineCompletionWrapper;