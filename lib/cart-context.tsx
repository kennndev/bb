"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { calculateDiscountedPrice } from '@/lib/pricing-utils'

// Types for cart items
export type CardFinish = 'matte' | 'rainbow' | 'gloss'

export interface CartItemBase {
  id: string
  quantity: number
  includeDisplayCase: boolean
  displayCaseQuantity: number
  basePricePerUnit: number // Store base price before discounts
  displayCasePricePerUnit?: number
}

export interface LimitedEditionCartItem extends CartItemBase {
  type: 'limited-edition'
  name: string
  image: string
}

export interface CustomCardCartItem extends CartItemBase {
  type: 'custom-card'
  name: string
  image: string
  cardFinish: CardFinish
  uploadId?: string
}

export interface MarketplaceCartItem extends CartItemBase {
  type: 'marketplace'
  name: string
  image: string
  listingId: string
  sellerId: string
  priceCents: number
}

export type CartItem = LimitedEditionCartItem | CustomCardCartItem | MarketplaceCartItem

// Cart context type
interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<CartItem>) => void
  clearCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
  isLoading: boolean
}

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined)

// Storage key
const CART_STORAGE_KEY = 'cardify-shopping-cart'

// Cart provider component
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        const parsedItems = JSON.parse(stored)
        // Validate the items before setting
        if (Array.isArray(parsedItems)) {
          setItems(parsedItems)
        }
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
      } catch (error) {
        console.error('Failed to save cart to storage:', error)
      }
    }
  }, [items, isLoading])

  // Add item to cart
  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    const id = `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    // Store base price in the item
    const itemWithBase = {
      ...item,
      basePricePerUnit: 'basePricePerUnit' in item ? item.basePricePerUnit : ((item as CartItem & {pricePerUnit?: number}).pricePerUnit || 0)
    }
    const newItem: CartItem = { ...itemWithBase, id } as CartItem
    
    setItems((prevItems: CartItem[]) => {
      // For limited edition, check if item already exists and update quantity
      if (item.type === 'limited-edition') {
        const existingIndex = prevItems.findIndex(
          i => i.type === 'limited-edition' && 
              i.includeDisplayCase === item.includeDisplayCase
        )
        
        if (existingIndex >= 0) {
          // Update existing item quantity
          const updated = [...prevItems]
          const existing = updated[existingIndex]
          updated[existingIndex] = {
            ...existing,
            quantity: existing.quantity + item.quantity,
            displayCaseQuantity: existing.includeDisplayCase 
              ? existing.displayCaseQuantity + item.displayCaseQuantity 
              : 0
          } as CartItem
          return updated
        }
      }
      
      // For marketplace items, check if same listing already exists
      if (item.type === 'marketplace') {
        const existingIndex = prevItems.findIndex(
          i => i.type === 'marketplace' && 
              (i as MarketplaceCartItem).listingId === (item as MarketplaceCartItem).listingId
        )
        
        if (existingIndex >= 0) {
          // Update existing item quantity
          const updated = [...prevItems]
          const existing = updated[existingIndex]
          updated[existingIndex] = {
            ...existing,
            quantity: existing.quantity + item.quantity,
            displayCaseQuantity: existing.includeDisplayCase 
              ? existing.displayCaseQuantity + item.displayCaseQuantity 
              : 0
          } as CartItem
          return updated
        }
      }
      
      // Add as new item
      return [...prevItems, newItem] as CartItem[]
    })
  }, [])

  // Remove item from cart
  const removeItem = useCallback((id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id))
  }, [])

  // Update item in cart
  const updateItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setItems(prevItems => prevItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }, [])

  // Clear entire cart
  const clearCart = useCallback(() => {
    setItems([])
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear cart from storage:', error)
    }
  }, [])

  // Get total item count
  const getItemCount = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }, [items])

  // Calculate subtotal with dynamic pricing
  const getSubtotal = useCallback(() => {
    return items.reduce((total, item) => {
      // Calculate discounted price based on quantity
      const pricing = calculateDiscountedPrice(
        item.type,
        item.quantity,
        item.basePricePerUnit
      )
      
      const displayCaseTotal = item.includeDisplayCase && item.displayCasePricePerUnit
        ? item.displayCasePricePerUnit * item.displayCaseQuantity
        : 0
      
      return total + pricing.totalPrice + displayCaseTotal
    }, 0)
  }, [items])

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    updateItem,
    clearCart,
    getItemCount,
    getSubtotal,
    isLoading
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

// Hook to use cart context
export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
