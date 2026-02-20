import { useState, useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMessages } from "@/hooks/useMessages";
import { Message } from "@/types";
import { COLORS, FONTS, CHANNEL_PRESETS } from "@/lib/theme";

export default function ChannelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name: string; icon: string; color: string }>();
  const [tab, setTab] = useState<"ask" | "history">("ask");
  const [input, setInput] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const { messages, loading, asking, ask } = useMessages(params.id);
  const flatRef = useRef<FlatList>(null);

  const preset = CHANNEL_PRESETS.find(p => p.color === params.color) ?? CHANNEL_PRESETS[0];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, asking]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || asking) return;
    setInput("");
    try {
      await ask(q, webSearch);
    } catch {
      Alert.alert("Error", "Couldn't get an answer. Please try again.");
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={[styles.botAvatar, { backgroundColor: preset.colorLight }]}>
            <Text style={[styles.botAvatarText, { color: params.color }]}>{params.icon}</Text>
          </View>
        )}
        <View style={{ maxWidth: "82%", gap: 6 }}>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
            <Text style={[styles.bubbleText, { color: isUser ? "#fff" : COLORS.text }]}>
              {item.content}
            </Text>
          </View>
          {item.source_pdf_name && (
            <View style={styles.sourceTag}>
              <Text style={styles.sourceIcon}>📄</Text>
              <Text style={styles.sourceName} numberOfLines={1}>{item.source_pdf_name}</Text>
              {item.source_page && <Text style={styles.sourcePage}>p.{item.source_page}</Text>}
              {item.web_used && (
                <View style={styles.webBadge}>
                  <Text style={styles.webBadgeText}>🌐 web</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <View style={[styles.channelIconSmall, { backgroundColor: preset.colorLight }]}>
          <Text style={[styles.channelIconText, { color: params.color }]}>{params.icon}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{params.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.pdfsBtn}
          onPress={() => router.push({ pathname: "/(app)/channel/pdfs", params: { id: params.id, name: params.name } })}
        >
          <Text style={styles.pdfsBtnText}>PDFs</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["ask", "history"] as const).map(t => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "ask" ? "Ask" : "History"}
            </Text>
            <View style={[styles.tabLine, tab === t && styles.tabLineActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {tab === "ask" ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          {/* Messages */}
          <FlatList
            ref={flatRef}
            data={messages.filter(m => m.role === "user" || m.role === "assistant")}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatIcon}>💬</Text>
                  <Text style={styles.emptyChatTitle}>Ask your first question</Text>
                  <Text style={styles.emptyChatSub}>Upload PDFs, then ask anything about {params.name}</Text>
                </View>
              ) : null
            }
          />

          {/* Typing indicator */}
          {asking && (
            <View style={styles.typingRow}>
              <View style={[styles.botAvatar, { backgroundColor: preset.colorLight }]}>
                <Text style={[styles.botAvatarText, { color: params.color }]}>{params.icon}</Text>
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={COLORS.textLight} />
              </View>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputArea}>
            <TouchableOpacity
              style={[styles.webToggle, webSearch && styles.webToggleOn]}
              onPress={() => setWebSearch(!webSearch)}
            >
              <Text style={styles.webToggleIcon}>🌐</Text>
              <Text style={[styles.webToggleText, webSearch && styles.webToggleTextOn]}>
                Web {webSearch ? "on" : "off"}
              </Text>
            </TouchableOpacity>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ask anything about this subject…"
                placeholderTextColor={COLORS.textLight}
                value={input}
                onChangeText={setInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || asking) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || asking}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={messages.filter(m => m.role === "user")}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.historyCard} onPress={() => setTab("ask")}>
              <Text style={styles.historyQ} numberOfLines={2}>{item.content}</Text>
              <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatTitle}>No questions yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { fontSize: 28, color: COLORS.textMuted, lineHeight: 32 },
  channelIconSmall: { width: 34, height: 34, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  channelIconText: { fontSize: 16, fontFamily: FONTS.bold },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.3 },
  pdfsBtn: { backgroundColor: COLORS.bg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6 },
  pdfsBtnText: { fontSize: 13, fontFamily: FONTS.semibold, color: COLORS.text },
  tabs: { flexDirection: "row", backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textMuted },
  tabTextActive: { fontFamily: FONTS.semibold, color: COLORS.text },
  tabLine: { height: 2, width: "60%", marginTop: 8, borderRadius: 1, backgroundColor: "transparent" },
  tabLineActive: { backgroundColor: COLORS.accent },
  messageList: { padding: 16, paddingBottom: 24, gap: 16 },
  msgRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  msgRowUser: { flexDirection: "row-reverse" },
  botAvatar: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  botAvatarText: { fontSize: 14, fontFamily: FONTS.bold },
  bubble: { borderRadius: 14, padding: 12, paddingHorizontal: 14 },
  bubbleUser: { backgroundColor: COLORS.accent, borderTopRightRadius: 4 },
  bubbleBot: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22 },
  sourceTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignSelf: "flex-start" },
  sourceIcon: { fontSize: 11 },
  sourceName: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted, maxWidth: 140 },
  sourcePage: { fontSize: 11, color: COLORS.textLight },
  webBadge: { backgroundColor: COLORS.blueLight, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  webBadgeText: { fontSize: 10, fontFamily: FONTS.semibold, color: COLORS.blue },
  typingRow: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 0, alignItems: "center" },
  typingBubble: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, borderTopLeftRadius: 4, padding: 12, paddingHorizontal: 20 },
  inputArea: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, padding: 12, paddingBottom: 28, gap: 10 },
  webToggle: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  webToggleOn: { borderColor: COLORS.blue, backgroundColor: COLORS.blueLight },
  webToggleIcon: { fontSize: 13 },
  webToggleText: { fontSize: 12, fontFamily: FONTS.semibold, color: COLORS.textMuted },
  webToggleTextOn: { color: COLORS.blue },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  input: { flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.accent, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { backgroundColor: COLORS.borderLight },
  sendIcon: { color: "#fff", fontSize: 18, fontFamily: FONTS.bold },
  emptyChat: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyChatIcon: { fontSize: 36 },
  emptyChatTitle: { fontSize: 16, fontFamily: FONTS.semibold, color: COLORS.text },
  emptyChatSub: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: "center", maxWidth: 240 },
  historyCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14 },
  historyQ: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text, lineHeight: 20 },
  historyDate: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 5 },
});
