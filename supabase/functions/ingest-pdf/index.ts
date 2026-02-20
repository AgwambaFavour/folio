// supabase/functions/ingest-pdf/index.ts
// Triggered after a PDF is uploaded. Extracts text, chunks it, embeds with OpenAI.
// Deploy with: supabase functions deploy ingest-pdf

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "https://esm.sh/pdfjs-dist@4.4.168/legacy/build/pdf.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_KEY = Deno.env.get("OPENAI_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Split text into overlapping chunks of ~500 tokens
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

// Batch embed with OpenAI (max 100 inputs per call)
async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  const data = await res.json();
  if (!data.data) throw new Error(`Embedding failed: ${JSON.stringify(data)}`);
  return data.data.map((d: any) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { pdfId } = await req.json() as { pdfId: string };

    // Load PDF record
    const { data: pdf } = await supabase.from("pdfs").select("*").eq("id", pdfId).single();
    if (!pdf) return new Response("PDF not found", { status: 404 });

    // Download the PDF bytes from storage
    const { data: fileData } = await supabase.storage.from("pdfs").download(pdf.storage_path);
    if (!fileData) throw new Error("Could not download PDF");

    const buffer = await fileData.arrayBuffer();
    const pdfDoc = await getDocument({ data: buffer }).promise;
    const numPages = pdfDoc.numPages;

    // Extract text page by page, build chunks
    const allChunks: Array<{ content: string; page_number: number }> = [];

    for (let p = 1; p <= numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ").trim();
      if (!pageText) continue;

      const chunks = chunkText(pageText);
      chunks.forEach((c) => allChunks.push({ content: c, page_number: p }));
    }

    // Embed in batches of 100
    const BATCH = 100;
    const embeddings: number[][] = [];
    for (let i = 0; i < allChunks.length; i += BATCH) {
      const batch = allChunks.slice(i, i + BATCH).map((c) => c.content);
      const batchEmbeds = await embedBatch(batch);
      embeddings.push(...batchEmbeds);
    }

    // Insert chunks into DB
    const rows = allChunks.map((c, i) => ({
      pdf_id: pdfId,
      channel_id: pdf.channel_id,
      user_id: pdf.user_id,
      content: c.content,
      page_number: c.page_number,
      embedding: embeddings[i],
    }));

    // Insert in batches of 50 to avoid request size limits
    for (let i = 0; i < rows.length; i += 50) {
      await supabase.from("chunks").insert(rows.slice(i, i + 50));
    }

    // Mark PDF as indexed and update page count
    await supabase.from("pdfs").update({ indexed: true, page_count: numPages }).eq("id", pdfId);

    return new Response(
      JSON.stringify({ success: true, chunks: rows.length, pages: numPages }),
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
