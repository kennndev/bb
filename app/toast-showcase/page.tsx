"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2, Sparkles, CreditCard, Package, Zap, Trophy, Gift, ShoppingCart, Rocket } from "lucide-react"

export default function ToastShowcasePage() {
  const { toast } = useToast()

  const showDefaultToast = () => {
    toast({
      title: "Default Notification",
      description: "This is a default toast notification with cyberpunk styling"
    })
  }

  const showSuccessToast = () => {
    toast({
      title: "Success!",
      description: "Your action was completed successfully",
      variant: "success"
    })
  }

  const showDestructiveToast = () => {
    toast({
      title: "Error Occurred",
      description: "Something went wrong. Please try again.",
      variant: "destructive"
    })
  }

  const showDestructiveWithActionToast = () => {
    toast({
      title: "Upload Failed",
      description: "Duplicate image detected. This image has already been uploaded.",
      variant: "destructive",
      action: <ToastAction altText="Try Again">Try Again</ToastAction>
    })
  }

  const showInsufficientCreditsToast = () => {
    toast({
      title: "Insufficient Credits",
      description: "You need 100 credits to purchase this package. Redirecting to credits page...",
      variant: "destructive",
      action: <ToastAction altText="Buy Credits">Buy Credits</ToastAction>
    })
  }

  const showToastWithAction = () => {
    toast({
      title: "Undo Action",
      description: "This action can be undone",
      action: <ToastAction altText="Undo">Undo</ToastAction>
    })
  }

  const showPaymentSuccessToast = () => {
    toast({
      title: "Payment Successful!",
      description: "Your card order has been confirmed. Order #12345",
      variant: "success"
    })
  }

  const showUploadErrorToast = () => {
    toast({
      title: "Upload Failed",
      description: "File size exceeds 10MB limit. Please compress your image.",
      variant: "destructive"
    })
  }

  const showCreditsAddedToast = () => {
    toast({
      title: "Credits Added",
      description: "50 credits have been added to your account",
      variant: "success"
    })
  }

  const showCheckoutInitiatedToast = () => {
    toast({
      title: "Redirecting to checkout...",
      description: "Please wait while we prepare your order"
    })
  }

  const showSignInRequiredToast = () => {
    toast({
      title: "Sign in required",
      description: "Please sign in to continue",
      variant: "destructive"
    })
  }

  const showCardGeneratedToast = () => {
    toast({
      title: "Card Generated!",
      description: "Your AI-powered trading card is ready",
      variant: "success",
      action: <ToastAction altText="View">View Card</ToastAction>
    })
  }

  const showInventoryWarningToast = () => {
    toast({
      title: "Low Stock Warning",
      description: "Only 3 items remaining in stock"
    })
  }

  const showShippingToast = () => {
    toast({
      title: "Order Shipped",
      description: "Your package is on its way. Track #CP2077-001",
      action: <ToastAction altText="Track">Track Order</ToastAction>
    })
  }

  const showBulkDiscountToast = () => {
    toast({
      title: "Bulk Discount Applied!",
      description: "You saved $15 with bulk pricing",
      variant: "success"
    })
  }

  const showFileRenamedToast = () => {
    toast({
      title: "File Renamed",
      description: "Successfully renamed to 'cyberpunk-card-001.png'"
    })
  }

  const showProcessingToast = () => {
    toast({
      title: "Processing...",
      description: "Generating your custom trading card"
    })
  }

  const showLongDescriptionToast = () => {
    toast({
      title: "Order Summary",
      description: "Your order includes: 5x Cyberpunk Cards, 2x Premium Cases, 1x Limited Edition Holographic Card. Total: $89.99 (after bulk discount)"
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Toast Notification Showcase</h1>
        <p className="text-gray-300 mb-8">Actual toast notifications used in Cardify with Radix UI</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Variants */}
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Basic Variants</h3>
            <div className="space-y-3">
              <Button onClick={showDefaultToast} className="w-full" variant="outline">
                Default Toast (Purple)
              </Button>
              <Button onClick={showSuccessToast} className="w-full" variant="outline">
                Success Toast (Green)
              </Button>
              <Button onClick={showDestructiveToast} className="w-full" variant="outline">
                Destructive Toast (Red)
              </Button>
              <Button onClick={showToastWithAction} className="w-full" variant="outline">
                Toast with Action
              </Button>
            </div>
          </div>

          {/* Destructive with Actions */}
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Errors with Actions</h3>
            <div className="space-y-3">
              <Button onClick={showDestructiveWithActionToast} className="w-full" variant="outline">
                Duplicate Error + Retry
              </Button>
              <Button onClick={showInsufficientCreditsToast} className="w-full" variant="outline">
                Insufficient Credits + Buy
              </Button>
              <Button onClick={showSignInRequiredToast} className="w-full" variant="outline">
                Sign In Required
              </Button>
            </div>
          </div>

          {/* App-Specific Toasts */}
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Upload & Generation</h3>
            <div className="space-y-3">
              <Button onClick={showCardGeneratedToast} className="w-full" variant="outline">
                Card Generated
              </Button>
              <Button onClick={showUploadErrorToast} className="w-full" variant="outline">
                Upload Error
              </Button>
              <Button onClick={showProcessingToast} className="w-full" variant="outline">
                Processing
              </Button>
              <Button onClick={showFileRenamedToast} className="w-full" variant="outline">
                File Renamed
              </Button>
            </div>
          </div>

          {/* E-commerce Toasts */}
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">E-commerce</h3>
            <div className="space-y-3">
              <Button onClick={showPaymentSuccessToast} className="w-full" variant="outline">
                Payment Success
              </Button>
              <Button onClick={showCheckoutInitiatedToast} className="w-full" variant="outline">
                Checkout Initiated
              </Button>
              <Button onClick={showBulkDiscountToast} className="w-full" variant="outline">
                Bulk Discount
              </Button>
              <Button onClick={showShippingToast} className="w-full" variant="outline">
                Order Shipped
              </Button>
            </div>
          </div>

          {/* Account & Credits */}
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Account & Credits</h3>
            <div className="space-y-3">
              <Button onClick={showCreditsAddedToast} className="w-full" variant="outline">
                Credits Added
              </Button>
              <Button onClick={showInventoryWarningToast} className="w-full" variant="outline">
                Low Stock Warning
              </Button>
            </div>
          </div>

          {/* Edge Cases */}
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Edge Cases</h3>
            <div className="space-y-3">
              <Button onClick={showLongDescriptionToast} className="w-full" variant="outline">
                Long Description
              </Button>
            </div>
          </div>

          {/* Toast Configuration */}
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Toast Features</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p><span className="text-purple-400">Position:</span> Top-right on mobile, bottom-right on desktop</p>
              <p><span className="text-purple-400">Styling:</span> Cyberpunk theme with glow effects</p>
              <p><span className="text-purple-400">Backdrop:</span> Blur with semi-transparent background</p>
              <p><span className="text-purple-400">Borders:</span> Gradient borders with shadow glow</p>
              <p><span className="text-purple-400">Library:</span> Radix UI Toast</p>
              <p><span className="text-purple-400">Animation:</span> Slide in/out with fade</p>
            </div>
          </div>
        </div>

        {/* Visual Examples */}
        <div className="mt-8 bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Visual Examples</h3>
          <div className="space-y-4">
            {/* Default Toast Example */}
            <div className="border-2 border-[#8a2be2]/30 bg-gray-900/95 text-gray-100 shadow-[0_0_30px_rgba(138,43,226,0.3)] rounded-lg p-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#8a2be2]/10 to-cyan-500/10 rounded-lg -z-10"></div>
              <h4 className="text-sm font-bold tracking-wide text-white">Default Notification</h4>
              <p className="text-sm text-gray-300 mt-1">This is how default toasts appear with purple theme</p>
            </div>

            {/* Success Toast Example */}
            <div className="border-2 border-[#00ff41]/40 bg-gray-900/95 text-[#00ff41] shadow-[0_0_30px_rgba(0,255,65,0.3)] rounded-lg p-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00ff41]/10 to-[#00ff41]/5 rounded-lg -z-10"></div>
              <h4 className="text-sm font-bold tracking-wide text-white">Success!</h4>
              <p className="text-sm text-gray-300 mt-1">Success toasts with green neon glow</p>
            </div>

            {/* Destructive Toast Example */}
            <div className="border-2 border-red-500/50 bg-red-950/95 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.4)] rounded-lg p-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-lg -z-10"></div>
              <h4 className="text-sm font-bold tracking-wide text-white">Error Occurred</h4>
              <p className="text-sm text-gray-300 mt-1">Destructive toasts with red warning glow</p>
            </div>
          </div>
        </div>

        {/* Usage Example */}
        <div className="mt-8 bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Usage Example</h3>
          <pre className="bg-black/60 rounded p-4 overflow-x-auto">
            <code className="text-green-400 text-sm">{`import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

function MyComponent() {
  const { toast } = useToast()

  // Default toast
  toast({
    title: "Notification",
    description: "Something happened"
  })

  // Success variant
  toast({
    title: "Success!",
    variant: "success"
  })

  // With action button
  toast({
    title: "Undo",
    action: <ToastAction altText="Undo">Undo</ToastAction>
  })
}`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}