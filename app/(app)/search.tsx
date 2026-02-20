import { useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useChannels } from "@/hooks/useChannels";
import { COLORS, FONTS, CHANNEL_PRESETS } from "@/lib/theme";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const { channels } = useChannels();
  const router = useRouter();

  const filtered = query.trim()
    ? channels.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : channels;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search channels, PDFs, questions…"
          placeholderTextColor={COLORS.textLight}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const preset = CHANNEL_PRESETS.find(p => p.color === item.color) ?? CHANNEL_PRESETS[0];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: "/(app)/channel/[id]", params: { id: item.id, name: item.name, icon: item.icon, color: item.color } })}
              activeOpacity={0.7}
            >
              <View style={[styles.icon, { backgroundColor: preset.colorLight }]}>
                <Text style={[styles.iconText, { color: item.color }]}>{item.icon}</Text>
              </View>
              <View>
                <Text style={styles.channelName}>{item.name}</Text>
                <Text style={styles.channelMeta}>{item.pdf_count ?? 0} PDFs</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingBottom: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.5 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 11 },
  searchIcon: { fontSize: 15 },
  input: { flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text },
  list: { paddingHorizontal: 16 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  icon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  iconText: { fontSize: 18, fontFamily: FONTS.bold },
  channelName: { fontSize: 14, fontFamily: FONTS.semibold, color: COLORS.text },
  channelMeta: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted },
});
