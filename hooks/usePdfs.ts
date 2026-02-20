import { useState, useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
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
    if (!user || !session) return;

    // Let user pick a PDF
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];

    setUploading(true);
    setUploadProgress(0);

    try {
      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);

      // Upload to Supabase Storage: pdfs/{userId}/{uuid}.pdf
      const storagePath = `${user.id}/${Date.now()}-${file.name}`;
      setUploadProgress(30);

      const { error: storageError } = await supabase.storage
        .from("pdfs")
        .upload(storagePath, arrayBuffer, { contentType: "application/pdf" });

      if (storageError) throw storageError;
      setUploadProgress(60);

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
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ingest-pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentSession?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfId: pdfRecord.id }),
      });

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
