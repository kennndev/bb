// hooks/use-credits.ts
"use client"
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function useCredits(userId: string | undefined) {
  const [credits, setCredits] = useState<number>(0);
  const [freeGenerationsUsed, setFreeGenerationsUsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCredits(0);
      setFreeGenerationsUsed(0);
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    // Initial fetch
    const fetchCredits = async () => {
      const { data, error } = await supabase
        .from("profiles") // Updated table name
        .select("credits, free_generations_used")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setCredits(data.credits || 0);
        setFreeGenerationsUsed(data.free_generations_used || 0);
      }
      setLoading(false);
    };

    fetchCredits();

    // Realtime subscription
    const channel = supabase
      .channel(`credits-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, // Updated table name
        (payload) => {
          if (payload.new) {
            setCredits((payload.new as any).credits || 0);
            setFreeGenerationsUsed((payload.new as any).free_generations_used || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { credits, freeGenerationsUsed, loading };
}
