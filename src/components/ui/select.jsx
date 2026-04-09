// @ts-nocheck
"use client"
import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { cn } from "@/lib/utils"

// Hook to detect mobile viewport
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

// Context for mobile select
const MobileSelectContext = React.createContext({
  open: false,
  setOpen: () => {},
  value: "",
  onValueChange: () => {},
  isMobile: false
});

const Select = React.forwardRef(({ children, value, onValueChange, defaultValue, ...props }, ref) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  
  const currentValue = value !== undefined ? value : internalValue;
  const handleValueChange = onValueChange || setInternalValue;
  
  if (isMobile) {
    return (
      <MobileSelectContext.Provider value={{ 
        open, 
        setOpen, 
        value: currentValue, 
        onValueChange: handleValueChange,
        isMobile: true
      }}>
        {children}
      </MobileSelectContext.Provider>
    );
  }
  
  return (
    <MobileSelectContext.Provider value={{ isMobile: false }}>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} defaultValue={defaultValue} {...props}>
        {children}
      </SelectPrimitive.Root>
    </MobileSelectContext.Provider>
  );
});
Select.displayName = "Select"

const SelectGroup = SelectPrimitive.Group

const SelectValue = React.forwardRef(({ placeholder, ...props }, ref) => {
  const { value, isMobile } = React.useContext(MobileSelectContext);
  
  if (isMobile) {
    return (
      <span className={cn("block truncate", !value && "text-muted-foreground")}>
        {value || placeholder}
      </span>
    );
  }
  
  return <SelectPrimitive.Value ref={ref} placeholder={placeholder} {...props} />;
});
SelectValue.displayName = "SelectValue"

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { setOpen, isMobile } = React.useContext(MobileSelectContext);
  
  if (isMobile) {
    return (
      <button
        type="button"
        ref={ref}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 min-h-[44px] w-full items-center justify-between whitespace-nowrap rounded-full border border-input bg-transparent px-4 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
      </button>
    );
  }
  
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 min-h-[44px] md:min-h-0 w-full items-center justify-between whitespace-nowrap rounded-full border border-input bg-transparent px-4 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = "SelectTrigger"

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = "SelectScrollUpButton"

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = "SelectScrollDownButton"

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const { open, setOpen, isMobile } = React.useContext(MobileSelectContext);
  
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[50vh]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <DrawerHeader className="border-b pb-2">
            <DrawerTitle className="text-base">Select an option</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto p-2 pb-6">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-[10001] max-h-96 min-w-[8rem] overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = "SelectContent"

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = "SelectLabel"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const { value: selectedValue, onValueChange, setOpen, isMobile } = React.useContext(MobileSelectContext);
  
  if (isMobile) {
    const isSelected = selectedValue === value;
    return (
      <button
        type="button"
        ref={ref}
        onClick={() => {
          onValueChange(value);
          setOpen(false);
        }}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-lg py-3 min-h-[44px] px-3 text-sm outline-none transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          className
        )}
        {...props}
      >
        <span className="flex-1 text-left">{children}</span>
        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />}
      </button>
    );
  }
  
  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}