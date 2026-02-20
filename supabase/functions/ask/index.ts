// supabase/functions/ask/index.ts
// Deploy with: supabase functions deploy ask
// This keeps your Anthropic API key off the client device.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Auth — verify the user's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return new Response("Unauthorized", { status: 401 });

    // 2. Parse request
    const { question, channelId, useWebSearch, messageHistory } = await req.json() as {
      question: string;
      channelId: string;
      useWebSearch: boolean;
      messageHistory: Array<{ role: string; content: string }>;
    };

    // 3. Embed the question
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: question }),
    });
    const embedData = await embedRes.json();
    const queryEmbedding = embedData.data[0].embedding;

    // 4. Retrieve top-k relevant chunks
    const { data: chunks, error: chunkError } = await supabase.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_channel_id: channelId,
      match_user_id: user.id,
      match_count: 6,
    });

    if (chunkError) console.error("Chunk retrieval error:", chunkError);

    const hasRelevantChunks = chunks && chunks.length > 0 && chunks[0].similarity > 0.5;

    // 5. Build context for Claude
    let contextBlock = "";
    let topSource = null;

    if (hasRelevantChunks) {
      contextBlock = chunks
        .map((c: any) => `[Source: ${c.pdf_name}, page ${c.page_number}]\n${c.content}`)
        .join("\n\n---\n\n");
      topSource = { name: chunks[0].pdf_name, page: chunks[0].page_number };
    }

    const systemPrompt = `You are Folio, an AI study assistant. You help students understand their academic material.

${hasRelevantChunks ? `Use the following excerpts from the student's uploaded PDFs to answer their question. Always prefer this material. If referencing it, note which PDF and page number.

<pdf_context>
${contextBlock}
</pdf_context>` : "No relevant PDF content was found for this question."}

${useWebSearch && !hasRelevantChunks ? "Since no PDF content is available, you may use your general knowledge to help." : ""}

Rules:
- Be concise but thorough. Use markdown formatting (bold, bullet points) where helpful.
- If the PDFs don't contain the answer and web search is off, say so clearly and offer what you know.
- Never make up citations — only cite PDFs that were actually provided above.
- Keep mathematical notation readable (e.g. use plain text like F(x), integral, etc. for equations).`;

    // 6. Call Anthropic Claude
    const tools = useWebSearch && !hasRelevantChunks ? [{
      type: "web_search_20250305",
      name: "web_search",
    }] : [];

    const anthropicBody: any = {
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...messageHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: question },
      ],
    };
    if (tools.length) anthropicBody.tools = tools;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        ...(tools.length ? { "anthropic-beta": "interleaved-thinking-2025-05-14" } : {}),
      },
      body: JSON.stringify(anthropicBody),
    });

    const claudeData = await claudeRes.json();
    const answerText = claudeData.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    const webWasUsed = claudeData.content.some((b: any) => b.type === "tool_use");

    // 7. Save both messages to DB
    await supabase.from("messages").insert([
      { channel_id: channelId, user_id: user.id, role: "user", content: question, web_used: false },
      {
        channel_id: channelId,
        user_id: user.id,
        role: "assistant",
        content: answerText,
        source_pdf_name: topSource?.name ?? null,
        source_page: topSource?.page ?? null,
        web_used: webWasUsed,
      },
    ]);

    return new Response(
      JSON.stringify({ answer: answerText, source: topSource, webUsed: webWasUsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
