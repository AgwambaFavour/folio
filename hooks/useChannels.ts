import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Channel } from "@/types";
import { useAuth } from "./useAuth";

export function useChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("channels")
        .select(`
          *,
          pdf_count:pdfs(count),
          question_count:messages(count)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChannels(
        (data ?? []).map((c) => ({
          ...c,
          pdf_count: c.pdf_count?.[0]?.count ?? 0,
          question_count: c.question_count?.[0]?.count ?? 0,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const createChannel = async (name: string, icon: string, color: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("channels")
      .insert({ user_id: user.id, name, icon, color })
      .select()
      .single();
    if (error) throw error;
    setChannels((prev) => [data, ...prev]);
    return data;
  };

  const deleteChannel = async (id: string) => {
    await supabase.from("channels").delete().eq("id", id);
    setChannels((prev) => prev.filter((c) => c.id !== id));
  };

  return { channels, loading, refetch: fetchChannels, createChannel, deleteChannel };
}
