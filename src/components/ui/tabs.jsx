// @ts-nocheck
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/** @type {React.ForwardRefRenderFunction<any, any>} */
function TabsListComponent({ className, children, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-full bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
}
const TabsList = React.forwardRef(TabsListComponent);
TabsList.displayName = TabsPrimitive.List.displayName

/** @type {React.ForwardRefRenderFunction<any, any>} */
function TabsTriggerComponent({ className, children, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}
const TabsTrigger = React.forwardRef(TabsTriggerComponent);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/** @type {React.ForwardRefRenderFunction<any, any>} */
function TabsContentComponent({ className, children, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Content>
  );
}
const TabsContent = React.forwardRef(TabsContentComponent);
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }