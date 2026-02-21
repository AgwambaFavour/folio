import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VOYAGE_KEY = Deno.env.get("VOYAGE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VOYAGE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "voyage-3-lite", input: texts }),
  });
  const data = await res.json();
  if (!data.data) throw new Error(`Voyage failed: ${JSON.stringify(data)}`);
  return data.data.map((d: any) => d.embedding);
}

// Extract text from PDF bytes using regex on raw content
function extractTextFromPdf(bytes: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];
  
  // Extract text between BT and ET markers (PDF text blocks)
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];
    // Extract strings in parentheses
    const strRegex = /\(([^)]*)\)/g;
    let strMatch;
    while ((strMatch = strRegex.exec(block)) !== null) {
      const str = strMatch[1]
        .replace(/\\n/g, " ")
        .replace(/\\r/g, " ")
        .replace(/\\\\/g, "\\")
        .replace(/\\'/g, "'")
        .trim();
      if (str.length > 1) chunks.push(str);
    }
  }
  
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("ingest-pdf started");
    const { pdfId } = await req.json();
    console.log("Processing PDF:", pdfId);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: pdf } = await supabase.from("pdfs").select("*").eq("id", pdfId).single();
    if (!pdf) throw new Error("PDF not found");
    console.log("PDF record:", pdf.name);

    const { data: fileData } = await supabase.storage.from("pdfs").download(pdf.storage_path);
    if (!fileData) throw new Error("Could not download PDF");
    console.log("PDF downloaded");

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const rawText = extractTextFromPdf(bytes);
// Remove non-printable and problematic unicode characters
const fullText = rawText
  .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, " ")
  .replace(/\\u[0-9a-fA-F]{4}/g, " ")
  .replace(/[^\x20-\x7E\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();
console.log("Text extracted, length:", fullText.length);
    if (!fullText || fullText.length < 10) {
      throw new Error("Could not extract text from PDF — it may be scanned/image-based");
    }

    const textChunks = chunkText(fullText);
    console.log("Chunks created:", textChunks.length);

    // Embed in batches
    const BATCH = 128;
    const embeddings: number[][] = [];
   for (let i = 0; i < textChunks.length; i += BATCH) {
  const batch = textChunks.slice(i, i + BATCH);
  const batchEmbeds = await embedBatch(batch);
  embeddings.push(...batchEmbeds);
  if (i + BATCH < textChunks.length) {
    await new Promise(resolve => setTimeout(resolve, 20000)); // 20s between batches
  }
}

    const rows = textChunks.map((content, i) => ({
      pdf_id: pdfId,
      channel_id: pdf.channel_id,
      user_id: pdf.user_id,
      content,
      page_number: 1,
      embedding: embeddings[i],
    }));

   for (let i = 0; i < rows.length; i += 50) {
  const { error: insertError } = await supabase.from("chunks").insert(rows.slice(i, i + 50));
  if (insertError) {
    console.error("Insert error:", JSON.stringify(insertError));
    throw new Error(`Insert failed: ${insertError.message}`);
  }
  console.log(`Inserted batch ${i / 50 + 1}`);
}

    await supabase.from("pdfs").update({ indexed: true, page_count: 1 }).eq("id", pdfId);
    console.log("Done! Indexed", rows.length, "chunks");

    return new Response(
      JSON.stringify({ success: true, chunks: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error:", String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});