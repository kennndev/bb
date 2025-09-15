'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CyberDefense } from '@/components/cyber-defense';

export default function GameTestPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  const handleToggle = () => {
    if (isGenerating) {
      setIsGenerating(false);
    } else {
      setIsGenerating(true);
      setStartTime(Date.now());
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black relative overflow-hidden flex flex-col items-center justify-center p-4 pt-24">
      {/* Background effects */}
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="fixed inset-0 scanlines opacity-20 pointer-events-none" />
      
      {/* Simple controls */}
      <div className="mb-6">
        <Button
          onClick={handleToggle}
          className={isGenerating ? "bg-cyber-pink hover:bg-cyber-pink/80" : "cyber-button"}
        >
          {isGenerating ? 'Stop' : 'Start'} Generation
        </Button>
      </div>

      {/* Card with game */}
      <div className="relative w-full max-w-md">
        <div
          className="relative w-full"
          style={{
            aspectRatio: "2.5 / 3.5",
            maxWidth: "100%",
          }}
        >
          <div className="relative w-full h-full rounded-2xl border-2 border-cyber-cyan/50 shadow-2xl cyber-card-glow-gradient overflow-hidden bg-cyber-dark">
            <div className="absolute inset-0">
              <CyberDefense 
                isGenerating={isGenerating} 
                startTime={startTime}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}