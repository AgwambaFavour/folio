import { useState, useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";
import { Pdf } from "@/types";
import { useAuth } from "./useAuth";

export function usePdfs(channelId: string) {
  const { user, session } = useAuth();
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchPdfs = useCallback(async () => {
    if (!user || !channelId) return;
    setLoading(true);
    const { data } = await supabase
      .from("pdfs")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });
    setPdfs(data ?? []);
    setLoading(false);
  }, [user, channelId]);

const pickAndUpload = async () => {
  if (!user || !session) {
    console.log("No user or session");
    return;
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
  });

  if (result.canceled) return;
  const file = result.assets?.[0];
  if (!file?.uri) throw new Error("Could not get file URI");
  
  console.log("File picked:", file.name, file.uri);
  setUploading(true);
  setUploadProgress(0);

  try {
    const base64 = await readAsStringAsync(file.uri, {
      encoding: "base64",
    }).catch((e) => { console.log("Read error:", e); return null; });

    if (!base64) throw new Error("Could not read file");
    console.log("Base64 length:", base64.length);

    const arrayBuffer = decode(base64);
    console.log("ArrayBuffer size:", arrayBuffer.byteLength);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
const storagePath = `${user.id}/${Date.now()}-${safeName}`;
    console.log("Uploading to:", storagePath);

    const { error: storageError } = await supabase.storage
      .from("pdfs")
      .upload(storagePath, arrayBuffer, { contentType: "application/pdf" });

    if (storageError) {
      console.log("Storage error:", JSON.stringify(storageError));
      throw storageError;
    }
    
    console.log("Upload success!");
  

      // Insert PDF record
      const { data: pdfRecord, error: dbError } = await supabase
        .from("pdfs")
        .insert({
          channel_id: channelId,
          user_id: user.id,
          name: file.name,
          storage_path: storagePath,
          size_bytes: file.size ?? 0,
          indexed: false,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setUploadProgress(80);

      // Trigger indexing Edge Function
      console.log("Triggering ingest-pdf...");
const { data: { session: currentSession } } = await supabase.auth.getSession();
console.log("Session token:", currentSession?.access_token ? "exists" : "missing");
console.log("PDF record ID:", pdfRecord.id);
const ingestRes = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ingest-pdf`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${currentSession?.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ pdfId: pdfRecord.id }),
});
console.log("Ingest response:", ingestRes.status);

// Wait 5 seconds then refetch to show updated status
setTimeout(() => {
  fetchPdfs();
}, 5000);

// Also refetch after 15 seconds in case indexing takes longer
setTimeout(() => {
  fetchPdfs();
}, 15000);
      setUploadProgress(100);
      setPdfs((prev) => [pdfRecord, ...prev]);

      return pdfRecord;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deletePdf = async (pdf: Pdf) => {
    await supabase.storage.from("pdfs").remove([pdf.storage_path]);
    await supabase.from("pdfs").delete().eq("id", pdf.id);
    setPdfs((prev) => prev.filter((p) => p.id !== pdf.id));
  };

  return { pdfs, loading, uploading, uploadProgress, fetchPdfs, pickAndUpload, deletePdf };
}
