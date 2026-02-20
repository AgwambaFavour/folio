import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Message } from "@/types";
import { useAuth } from "./useAuth";

export function useMessages(channelId: string) {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !channelId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    setLoading(false);
  }, [user, channelId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Subscribe to real-time inserts (for future collaborative mode)
  useEffect(() => {
    const sub = supabase
      .channel(`messages:${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channelId]);

  const ask = async (question: string, useWebSearch: boolean) => {
    if (!session) return;
    setAsking(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      channel_id: channelId,
      user_id: user!.id,
      role: "user",
      content: question,
      source_pdf_name: null,
      source_page: null,
      web_used: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ask`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentSession?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question,
            channelId,
            useWebSearch,
            messageHistory: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      // Real-time subscription will pick up the new assistant message from DB
      // But we refetch to be safe if real-time isn't wired yet
      await fetchMessages();
    } catch (err) {
      console.error("Ask error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      throw err;
    } finally {
      setAsking(false);
    }
  };

  return { messages, loading, asking, ask, refetch: fetchMessages };
}
