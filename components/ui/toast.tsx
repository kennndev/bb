"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg p-6 pr-8 transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border-2 border-[#8a2be2]/30 bg-gray-900/95 text-gray-100 shadow-[0_0_30px_rgba(138,43,226,0.3)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-[#8a2be2]/10 before:to-cyan-500/10 before:rounded-lg before:-z-10",
        destructive:
          "destructive group border-2 border-red-500/50 bg-red-950/95 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.4)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-red-500/20 before:to-red-600/20 before:rounded-lg before:-z-10",
        success:
          "border-2 border-[#00ff41]/40 bg-gray-900/95 text-[#00ff41] shadow-[0_0_30px_rgba(0,255,65,0.3)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-[#00ff41]/10 before:to-[#00ff41]/5 before:rounded-lg before:-z-10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border-2 border-[#8a2be2]/30 bg-[#8a2be2]/10 px-3 text-sm font-medium text-purple-100 transition-all hover:bg-[#8a2be2]/20 hover:border-[#8a2be2]/50 hover:shadow-[0_0_15px_rgba(138,43,226,0.4)] focus:outline-none focus:ring-2 focus:ring-[#8a2be2]/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-red-500/60 group-[.destructive]:bg-red-950/80 group-[.destructive]:text-red-100 group-[.destructive]:hover:border-red-400/80 group-[.destructive]:hover:bg-red-900/80 group-[.destructive]:hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] group-[.destructive]:focus:ring-red-500/50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-gray-400 opacity-0 transition-all hover:text-gray-100 hover:bg-white/10 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 group-hover:opacity-100 group-[.destructive]:text-red-400 group-[.destructive]:hover:text-red-100 group-[.destructive]:hover:bg-red-500/20 group-[.destructive]:focus:ring-red-500/50",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-bold tracking-wide text-white", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm text-gray-300", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
