"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Loader2 } from "lucide-react";
import AuthenticatedGeneratePage from "./authenticated";
import FreeGeneratePage from "../free-generate/page";

export default function GeneratePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthAndRoute = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // User is signed in, show authenticated generate page
          setIsAuthenticated(true);
        } else {
          // User is not signed in, show free generate page
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        // On error, show free generate page
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndRoute();
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-cyber-dark to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyber-cyan mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show the full generate page
  if (isAuthenticated) {
    return <AuthenticatedGeneratePage />;
  }

  // If not authenticated, show the free generate page
  return <FreeGeneratePage />;
}
