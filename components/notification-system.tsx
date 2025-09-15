"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Loader2, 
  Upload, 
  CreditCard, 
  ShoppingCart,
  Trash2,
  Edit,
  Download,
  Share
} from 'lucide-react'

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ConfirmationDialog {
  id: string
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  onCancel?: () => void
}

export interface LoadingDialog {
  id: string
  title: string
  description?: string
  progress?: number
}

// Context
interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void
  showConfirmation: (dialog: Omit<ConfirmationDialog, 'id'>) => Promise<boolean>
  showLoading: (dialog: Omit<LoadingDialog, 'id'>) => string
  hideLoading: (id: string) => void
  updateLoading: (id: string, updates: Partial<LoadingDialog>) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

// Provider component
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const [confirmations, setConfirmations] = useState<ConfirmationDialog[]>([])
  const [loadingDialogs, setLoadingDialogs] = useState<LoadingDialog[]>([])

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    
    // Get appropriate icon and variant
    let icon: React.ReactNode
    let variant: "default" | "destructive" = "default"
    
    switch (notification.type) {
      case 'success':
        icon = <CheckCircle className="h-4 w-4 text-green-600" />
        break
      case 'error':
        icon = <XCircle className="h-4 w-4 text-red-600" />
        variant = "destructive"
        break
      case 'warning':
        icon = <AlertTriangle className="h-4 w-4 text-yellow-600" />
        break
      case 'info':
        icon = <Info className="h-4 w-4 text-blue-600" />
        break
      case 'loading':
        icon = <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        break
    }

    toast({
      title: (
        <div className="flex items-center gap-2">
          {icon}
          {notification.title}
        </div>
      ),
      description: notification.description,
      variant,
      duration: notification.duration || (notification.type === 'error' ? 8000 : 5000),
      action: notification.action ? (
        <Button
          variant="outline"
          size="sm"
          onClick={notification.action.onClick}
          className="ml-2"
        >
          {notification.action.label}
        </Button>
      ) : undefined,
    })
  }, [toast])

  const showConfirmation = useCallback((dialog: Omit<ConfirmationDialog, 'id'>): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substr(2, 9)
      
      const confirmationDialog: ConfirmationDialog = {
        ...dialog,
        id,
        onConfirm: () => {
          dialog.onConfirm()
          setConfirmations(prev => prev.filter(d => d.id !== id))
          resolve(true)
        },
        onCancel: () => {
          dialog.onCancel?.()
          setConfirmations(prev => prev.filter(d => d.id !== id))
          resolve(false)
        }
      }
      
      setConfirmations(prev => [...prev, confirmationDialog])
    })
  }, [])

  const showLoading = useCallback((dialog: Omit<LoadingDialog, 'id'>): string => {
    const id = Math.random().toString(36).substr(2, 9)
    const loadingDialog: LoadingDialog = { ...dialog, id }
    setLoadingDialogs(prev => [...prev, loadingDialog])
    return id
  }, [])

  const hideLoading = useCallback((id: string) => {
    setLoadingDialogs(prev => prev.filter(d => d.id !== id))
  }, [])

  const updateLoading = useCallback((id: string, updates: Partial<LoadingDialog>) => {
    setLoadingDialogs(prev => 
      prev.map(d => d.id === id ? { ...d, ...updates } : d)
    )
  }, [])

  return (
    <NotificationContext.Provider value={{
      showNotification,
      showConfirmation,
      showLoading,
      hideLoading,
      updateLoading
    }}>
      {children}
      
      {/* Confirmation Dialogs */}
      {confirmations.map((dialog) => (
        <AlertDialog key={dialog.id} open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {dialog.variant === 'destructive' ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <Info className="h-5 w-5 text-blue-600" />
                )}
                {dialog.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {dialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={dialog.onCancel}>
                {dialog.cancelText || 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={dialog.onConfirm}
                className={dialog.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {dialog.confirmText || 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
      
      {/* Loading Dialogs */}
      {loadingDialogs.map((dialog) => (
        <Dialog key={dialog.id} open={true}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                {dialog.title}
              </DialogTitle>
              {dialog.description && (
                <DialogDescription>
                  {dialog.description}
                </DialogDescription>
              )}
            </DialogHeader>
            {dialog.progress !== undefined && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${dialog.progress}%` }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      ))}
    </NotificationContext.Provider>
  )
}

// Hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Predefined notification helpers
export const notificationHelpers = {
  // Upload notifications
  uploadSuccess: (fileName: string) => ({
    type: 'success' as const,
    title: 'Upload Successful! 🎉',
    description: `${fileName} has been uploaded successfully.`,
    action: {
      label: 'View in Gallery',
      onClick: () => window.location.href = '/profile'
    }
  }),
  
  uploadError: (error: string) => ({
    type: 'error' as const,
    title: 'Upload Failed',
    description: error,
    action: {
      label: 'Try Again',
      onClick: () => window.location.reload()
    }
  }),
  
  uploadInsufficientCredits: () => ({
    type: 'error' as const,
    title: 'Insufficient Credits',
    description: 'You need more credits to upload images. Purchase credits to continue.',
    action: {
      label: 'Buy Credits',
      onClick: () => window.location.href = '/credits'
    }
  }),
  
  // Payment notifications
  paymentSuccess: (amount: number) => ({
    type: 'success' as const,
    title: 'Payment Successful! 💳',
    description: `Your payment of $${(amount / 100).toFixed(2)} has been processed.`,
  }),
  
  paymentError: (error: string) => ({
    type: 'error' as const,
    title: 'Payment Failed',
    description: error,
    action: {
      label: 'Retry Payment',
      onClick: () => window.location.reload()
    }
  }),
  
  // Purchase notifications
  purchaseSuccess: (itemName: string) => ({
    type: 'success' as const,
    title: 'Purchase Complete! 🛒',
    description: `You've successfully purchased ${itemName}.`,
    action: {
      label: 'View Purchase',
      onClick: () => window.location.href = '/profile'
    }
  }),
  
  // Generation notifications
  generationStarted: () => ({
    type: 'info' as const,
    title: 'Generating Image...',
    description: 'Your AI-generated image is being created. This may take a few moments.',
  }),
  
  generationSuccess: () => ({
    type: 'success' as const,
    title: 'Image Generated! ✨',
    description: 'Your AI-generated image is ready!',
    action: {
      label: 'View Image',
      onClick: () => window.location.href = '/gallery'
    }
  }),
  
  generationError: (error: string) => ({
    type: 'error' as const,
    title: 'Generation Failed',
    description: error,
    action: {
      label: 'Try Again',
      onClick: () => window.location.reload()
    }
  }),
  
  // Delete confirmations
  deleteAsset: (assetName: string) => ({
    title: 'Delete Asset',
    description: `Are you sure you want to delete "${assetName}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'destructive' as const
  }),
  
  deleteAccount: () => ({
    title: 'Delete Account',
    description: 'Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.',
    confirmText: 'Delete Account',
    cancelText: 'Cancel',
    variant: 'destructive' as const
  }),
  
  // Loading dialogs
  uploading: (fileName: string) => ({
    title: 'Uploading Image',
    description: `Uploading ${fileName}...`
  }),
  
  processing: () => ({
    title: 'Processing Image',
    description: 'Processing your image for optimal quality...'
  }),
  
  generating: () => ({
    title: 'Generating Image',
    description: 'Creating your AI-generated image...'
  }),
  
  purchasing: () => ({
    title: 'Processing Purchase',
    description: 'Processing your payment...'
  })
}
