import { useEffect } from "react";
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePdfs } from "@/hooks/usePdfs";
import { Pdf } from "@/types";
import { COLORS, FONTS } from "@/lib/theme";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function PdfsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const { pdfs, loading, uploading, uploadProgress, fetchPdfs, pickAndUpload, deletePdf } = usePdfs(params.id);

  useEffect(() => { fetchPdfs(); }, []);

  const handleUpload = async () => {
    try {
      await pickAndUpload();
    } catch (err: any) {
      Alert.alert("Upload failed", err.message ?? "Please try again.");
    }
  };

  const handleDelete = (pdf: Pdf) => {
    Alert.alert("Delete PDF", `Remove "${pdf.name}" and all its indexed content?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePdf(pdf) },
    ]);
  };

  const renderPdf = ({ item }: { item: Pdf }) => (
    <View style={styles.pdfCard}>
      <View style={styles.pdfThumb}>
        <Text style={styles.pdfThumbText}>PDF</Text>
      </View>
      <View style={styles.pdfInfo}>
        <Text style={styles.pdfName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.pdfMeta}>
          {item.page_count && <Text style={styles.pdfMetaText}>{item.page_count} pages</Text>}
          <Text style={styles.pdfMetaText}>{formatBytes(item.size_bytes)}</Text>
          {item.indexed ? (
            <View style={styles.indexedBadge}><Text style={styles.indexedText}>✓ Indexed</Text></View>
          ) : (
            <View style={styles.indexingBadge}><ActivityIndicator size="small" color={COLORS.orange} /><Text style={styles.indexingText}> Indexing…</Text></View>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
        <Text style={styles.deleteBtn}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>PDFs</Text>
          <Text style={styles.headerSub}>{params.name}</Text>
        </View>
      </View>

      {/* Upload zone */}
      <TouchableOpacity
        style={[styles.uploadZone, uploading && styles.uploadZoneActive]}
        onPress={handleUpload}
        disabled={uploading}
        activeOpacity={0.7}
      >
        {uploading ? (
          <View style={styles.uploadingContent}>
            <ActivityIndicator color={COLORS.blue} />
            <Text style={styles.uploadingText}>Uploading & indexing… {uploadProgress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` as any }]} />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.uploadIcon}>📎</Text>
            <Text style={styles.uploadTitle}>Tap to upload a PDF</Text>
            <Text style={styles.uploadSub}>We'll index it so you can ask questions about it</Text>
          </>
        )}
      </TouchableOpacity>

      {/* PDF list */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.textMuted} />
      ) : (
        <FlatList
          data={pdfs}
          keyExtractor={(p) => p.id}
          renderItem={renderPdf}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No PDFs uploaded yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { fontSize: 28, color: COLORS.textMuted, lineHeight: 32 },
  headerTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted },
  uploadZone: { margin: 16, borderWidth: 2, borderStyle: "dashed", borderColor: COLORS.border, borderRadius: 16, padding: 28, alignItems: "center", gap: 8, backgroundColor: COLORS.surface },
  uploadZoneActive: { borderColor: COLORS.blue, backgroundColor: COLORS.blueLight },
  uploadIcon: { fontSize: 32 },
  uploadTitle: { fontSize: 15, fontFamily: FONTS.semibold, color: COLORS.text },
  uploadSub: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: "center" },
  uploadingContent: { alignItems: "center", gap: 10, width: "100%" },
  uploadingText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.blue },
  progressBar: { width: "100%", height: 4, backgroundColor: COLORS.borderLight, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: COLORS.blue, borderRadius: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  pdfCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  pdfThumb: { width: 40, height: 48, borderRadius: 6, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", justifyContent: "center", alignItems: "center" },
  pdfThumbText: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.red, letterSpacing: 1 },
  pdfInfo: { flex: 1, gap: 4 },
  pdfName: { fontSize: 13, fontFamily: FONTS.semibold, color: COLORS.text, letterSpacing: -0.2 },
  pdfMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pdfMetaText: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  indexedBadge: { backgroundColor: COLORS.greenLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  indexedText: { fontSize: 10, fontFamily: FONTS.semibold, color: COLORS.green },
  indexingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.orangeLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  indexingText: { fontSize: 10, fontFamily: FONTS.semibold, color: COLORS.orange },
  deleteBtn: { fontSize: 18, opacity: 0.5 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textMuted },
});
