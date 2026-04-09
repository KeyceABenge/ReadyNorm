/**
 * Offline Status Indicator
 * Shows current connectivity status and pending sync items
 */

import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { 
  Wifi, WifiOff, Cloud, RefreshCw, 
  CheckCircle2, AlertTriangle, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import useOfflineStatus from './useOfflineStatus';
import { format } from 'date-fns';

export default function OfflineStatusIndicator({ showDetails = true }) {
  const { 
    isOnline, 
    isOffline, 
    pendingCount, 
    syncState, 
    triggerSync,
    getDetailedStatus 
  } = useOfflineStatus();
  
  const [detailedStatus, setDetailedStatus] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getDetailedStatus().then(setDetailedStatus);
    }
  }, [isOpen, pendingCount, getDetailedStatus]);

  const handleSync = async () => {
    await triggerSync();
    const status = await getDetailedStatus();
    setDetailedStatus(status);
  };

  // Compact indicator for header
  if (!showDetails) {
    if (isOnline && pendingCount === 0) return null;
    
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        isOffline ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
      )}>
        {isOffline ? (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Upload className="w-3 h-3" />
            <span>{pendingCount}</span>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            "gap-1.5 h-8 px-2",
            isOffline && "text-amber-600",
            pendingCount > 0 && isOnline && "text-blue-600"
          )}
        >
          {isOffline ? (
            <WifiOff className="w-4 h-4" />
          ) : pendingCount > 0 ? (
            <Cloud className="w-4 h-4" />
          ) : (
            <Wifi className="w-4 h-4 text-emerald-600" />
          )}
          
          {isOffline && <span className="text-xs">Offline Mode</span>}
          
          {pendingCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end" sideOffset={8} style={{ zIndex: 9999 }}>
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOffline ? (
                <div className="p-2 rounded-full bg-amber-100">
                  <WifiOff className="w-4 h-4 text-amber-600" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-emerald-100">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">
                  {isOffline ? 'Offline Mode' : 'Connected'}
                </p>
                <p className="text-xs text-slate-500">
                  {isOffline 
                    ? 'Changes will sync when online'
                    : 'All changes syncing normally'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Pending Actions */}
          {pendingCount > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Pending Changes</span>
                <Badge variant="outline">{pendingCount}</Badge>
              </div>
              
              {syncState.isSyncing && syncState.progress && (
                <div className="space-y-1">
                  <Progress 
                    value={(syncState.progress.current / syncState.progress.total) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-slate-500">
                    Syncing {syncState.progress.current} of {syncState.progress.total}...
                  </p>
                </div>
              )}

              {!syncState.isSyncing && isOnline && (
                <Button 
                  size="sm" 
                  onClick={handleSync}
                  className="w-full mt-2"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Sync Now
                </Button>
              )}
            </div>
          )}

          {/* Detailed Status */}
          {detailedStatus && (
            <div className="space-y-2 text-sm">
              {detailedStatus.failedCount > 0 && (
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{detailedStatus.failedCount} failed to sync</span>
                </div>
              )}
              
              {detailedStatus.conflictCount > 0 && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{detailedStatus.conflictCount} conflicts detected</span>
                </div>
              )}

              {pendingCount === 0 && !isOffline && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All changes synced</span>
                </div>
              )}
            </div>
          )}

          {/* Last Sync Info */}
          {syncState.lastSyncTime && (
            <div className="text-xs text-slate-500 pt-2 border-t">
              Last synced: {format(new Date(syncState.lastSyncTime), 'h:mm a')}
              {syncState.lastSyncResult && (
                <span className="ml-1">
                  ({syncState.lastSyncResult.synced} synced)
                </span>
              )}
            </div>
          )}

          {/* Offline Info */}
          {isOffline && (
            <div className="text-xs text-slate-500 pt-2 border-t">
              <p>Your work is being saved locally. It will automatically sync when you're back online.</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}