/**
 * Mobile Tab Stack Manager
 * Preserves navigation state and scroll positions across tabs
 */

import { useRef, useCallback } from "react";

// Store for tab-specific state (scroll positions, routes)
const tabStateStore = {};

export function useTabStack(tabId) {
  const scrollRef = useRef(null);
  
  // Save scroll position when leaving tab
  const saveScrollPosition = useCallback(() => {
    if (scrollRef.current) {
      if (!tabStateStore[tabId]) {
        tabStateStore[tabId] = {};
      }
      tabStateStore[tabId].scrollY = scrollRef.current.scrollTop || window.scrollY;
    }
  }, [tabId]);
  
  // Restore scroll position when entering tab
  const restoreScrollPosition = useCallback(() => {
    const savedPosition = tabStateStore[tabId]?.scrollY;
    if (savedPosition !== undefined) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = savedPosition;
        } else {
          window.scrollTo(0, savedPosition);
        }
      });
    }
  }, [tabId]);
  
  // Reset scroll to top
  const resetToTop = useCallback(() => {
    if (tabStateStore[tabId]) {
      tabStateStore[tabId].scrollY = 0;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tabId]);
  
  return {
    scrollRef,
    saveScrollPosition,
    restoreScrollPosition,
    resetToTop
  };
}

// Hook for managing active tab with state preservation
export function useTabNavigation(initialTab = "tasks") {
  const previousTabRef = useRef(initialTab);
  
  const handleTabChange = useCallback((newTab, currentTab) => {
    // Save current tab's scroll position
    if (currentTab && tabStateStore[currentTab]) {
      tabStateStore[currentTab].scrollY = window.scrollY;
    }
    
    previousTabRef.current = currentTab;
    
    // Restore new tab's scroll position after render
    requestAnimationFrame(() => {
      const savedPosition = tabStateStore[newTab]?.scrollY || 0;
      window.scrollTo(0, savedPosition);
    });
  }, []);
  
  const handleActiveTabClick = useCallback((tabId) => {
    // Clicking active tab - reset to top
    if (tabStateStore[tabId]) {
      tabStateStore[tabId].scrollY = 0;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  return {
    handleTabChange,
    handleActiveTabClick,
    previousTab: previousTabRef.current
  };
}

export default { useTabStack, useTabNavigation };