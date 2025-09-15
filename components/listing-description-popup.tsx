"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Eye, X } from 'lucide-react'

interface ListingDescriptionPopupProps {
  description: string
  title?: string
  maxLength?: number
  className?: string
}

export function ListingDescriptionPopup({ 
  description, 
  title = "Listing Description",
  maxLength = 150,
  className = ""
}: ListingDescriptionPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const isLongDescription = description.length > maxLength
  const truncatedDescription = isLongDescription 
    ? description.substring(0, maxLength) + '...' 
    : description

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <h3 className="text-sm text-gray-400 font-medium">Description</h3>
        <div className="relative">
          <p className="text-white text-sm leading-relaxed">
            {truncatedDescription}
          </p>
          {isLongDescription && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="mt-2 text-cyber-cyan hover:text-cyber-cyan/80 hover:bg-cyber-cyan/10 p-1 h-auto text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Read Full Description
            </Button>
          )}
        </div>
      </div>

      {/* Full Description Popup */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-cyber-dark/95 border-2 border-cyber-cyan/50 text-white max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-cyber-cyan flex items-center justify-between">
              {title}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <div className="space-y-4">
              <div className="bg-cyber-dark/60 border border-cyber-cyan/30 rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">Full Description</h4>
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              </div>
              
              {/* Additional Info */}
              <div className="text-xs text-gray-500">
                <p>Character count: {description.length}</p>
                <p>Word count: {description.split(' ').length}</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-cyber-cyan/30">
            <Button
              onClick={() => setIsOpen(false)}
              className="bg-cyber-cyan/20 border border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan/30"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Compact version for cards
export function CompactListingDescription({ 
  description, 
  maxLength = 100,
  className = ""
}: Omit<ListingDescriptionPopupProps, 'title'>) {
  const [isOpen, setIsOpen] = useState(false)
  
  const isLongDescription = description.length > maxLength
  const truncatedDescription = isLongDescription 
    ? description.substring(0, maxLength) + '...' 
    : description

  return (
    <>
      <div className={`${className}`}>
        <p className="text-gray-300 text-xs leading-relaxed">
          {truncatedDescription}
        </p>
        {isLongDescription && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="mt-1 text-cyber-cyan hover:text-cyber-cyan/80 hover:bg-cyber-cyan/10 p-0 h-auto text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Read more
          </Button>
        )}
      </div>

      {/* Full Description Popup */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-cyber-dark/95 border-2 border-cyber-cyan/50 text-white max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-cyber-cyan flex items-center justify-between">
              Listing Description
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <div className="space-y-4">
              <div className="bg-cyber-dark/60 border border-cyber-cyan/30 rounded-lg p-4">
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-cyber-cyan/30">
            <Button
              onClick={() => setIsOpen(false)}
              className="bg-cyber-cyan/20 border border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan/30"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
