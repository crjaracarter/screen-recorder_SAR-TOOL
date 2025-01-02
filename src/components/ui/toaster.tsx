"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastProps
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

interface ToasterProps {
  className?: string;
}

interface ToastInstance extends ToastProps {
  id: string;
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function Toaster({ className }: ToasterProps) {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }: ToastInstance) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && (
                <ToastTitle className="text-sm font-semibold">
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className="text-sm opacity-90">
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-foreground/50 hover:text-foreground" />
          </Toast>
        )
      })}
      <ToastViewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastProvider>
  )
}