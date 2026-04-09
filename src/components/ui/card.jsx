import * as React from "react"

import { cn } from "@/lib/utils"

/** @type {React.ForwardRefRenderFunction<HTMLDivElement, any>} */
function CardComponent({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("rounded-2xl border bg-card text-card-foreground shadow", className)}
      {...props}
    >
      {children}
    </div>
  );
}
const Card = React.forwardRef(CardComponent);
Card.displayName = "Card"

/** @type {React.ForwardRefRenderFunction<HTMLDivElement, any>} */
function CardHeaderComponent({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}
const CardHeader = React.forwardRef(CardHeaderComponent);
CardHeader.displayName = "CardHeader"

/** @type {React.ForwardRefRenderFunction<HTMLDivElement, any>} */
function CardTitleComponent({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </div>
  );
}
const CardTitle = React.forwardRef(CardTitleComponent);
CardTitle.displayName = "CardTitle"

/** @type {React.ForwardRefRenderFunction<HTMLDivElement, any>} */
function CardDescriptionComponent({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  );
}
const CardDescription = React.forwardRef(CardDescriptionComponent);
CardDescription.displayName = "CardDescription"

/** @type {React.ForwardRefRenderFunction<HTMLDivElement, any>} */
function CardContentComponent({ className, children, ...props }, ref) {
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props}>{children}</div>;
}
const CardContent = React.forwardRef(CardContentComponent);
CardContent.displayName = "CardContent"

/** @type {React.ForwardRefRenderFunction<HTMLDivElement, any>} */
function CardFooterComponent({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}
const CardFooter = React.forwardRef(CardFooterComponent);
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }