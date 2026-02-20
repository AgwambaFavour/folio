import { useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  StyleSheet, Modal, ActivityIndicator, Alert, RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useChannels } from "@/hooks/useChannels";
import { Channel } from "@/types";
import { COLORS, FONTS, CHANNEL_PRESETS } from "@/lib/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { channels, loading, refetch, createChannel } = useChannels();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [creating, setCreating] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";
  const totalPdfs = channels.reduce((s, c) => s + (c.pdf_count ?? 0), 0);
  const totalQuestions = channels.reduce((s, c) => s + (c.question_count ?? 0), 0);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const preset = CHANNEL_PRESETS[selectedPreset];
      await createChannel(newName.trim(), preset.icon, preset.color);
      setShowModal(false);
      setNewName("");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setCreating(false);
    }
  };

  const renderChannel = ({ item }: { item: Channel }) => {
    const preset = CHANNEL_PRESETS.find(p => p.color === item.color) ?? CHANNEL_PRESETS[0];
    return (
      <TouchableOpacity
        style={styles.channelCard}
        onPress={() => router.push({ pathname: "/(app)/channel/[id]", params: { id: item.id, name: item.name, icon: item.icon, color: item.color } })}
        activeOpacity={0.7}
      >
        <View style={[styles.channelIcon, { backgroundColor: preset.colorLight }]}>
          <Text style={[styles.channelIconText, { color: item.color }]}>{item.icon}</Text>
        </View>
        <View style={styles.channelInfo}>
          <Text style={styles.channelName}>{item.name}</Text>
          <Text style={styles.channelMeta}>{item.pdf_count ?? 0} PDFs · {item.question_count ?? 0} questions</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.name}>{firstName}'s Workspace</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: "Channels", value: channels.length },
          { label: "PDFs", value: totalPdfs },
          { label: "Questions", value: totalQuestions },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Channel list */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Channels</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Text style={styles.newBtn}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.textMuted} />
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(c) => c.id}
          renderItem={renderChannel}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No channels yet</Text>
              <Text style={styles.emptySubtitle}>Create your first channel to start studying</Text>
            </View>
          }
        />
      )}

      {/* New channel modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Channel</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Channel name, e.g. Calculus III"
              placeholderTextColor={COLORS.textLight}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <Text style={styles.modalLabel}>Choose an icon</Text>
            <View style={styles.presetGrid}>
              {CHANNEL_PRESETS.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelectedPreset(i)}
                  style={[styles.presetItem, { backgroundColor: p.colorLight, borderColor: selectedPreset === i ? p.color : "transparent", borderWidth: 2 }]}
                >
                  <Text style={[styles.presetIcon, { color: p.color }]}>{p.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, (!newName.trim() || creating) && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  greeting: { fontSize: 11, fontFamily: FONTS.semibold, color: COLORS.textMuted, letterSpacing: 1.5, textTransform: "uppercase" },
  name: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.5, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
  statsRow: { flexDirection: "row", gap: 10, padding: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontFamily: FONTS.semibold, color: COLORS.text },
  newBtn: { fontSize: 13, fontFamily: FONTS.semibold, color: COLORS.blue },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  channelCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  channelIcon: { width: 44, height: 44, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  channelIconText: { fontSize: 20, fontFamily: FONTS.bold },
  channelInfo: { flex: 1 },
  channelName: { fontSize: 15, fontFamily: FONTS.semibold, color: COLORS.text, letterSpacing: -0.3 },
  channelMeta: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  chevron: { fontSize: 20, color: COLORS.textLight },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.semibold, color: COLORS.text },
  emptySubtitle: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.4 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: FONTS.regular, color: COLORS.text, backgroundColor: COLORS.bg },
  modalLabel: { fontSize: 13, fontFamily: FONTS.semibold, color: COLORS.textMuted },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  presetItem: { width: 52, height: 52, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  presetIcon: { fontSize: 22, fontFamily: FONTS.bold },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontFamily: FONTS.semibold, color: COLORS.text },
  createBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: "center" },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { fontSize: 15, fontFamily: FONTS.semibold, color: "#fff" },
});
