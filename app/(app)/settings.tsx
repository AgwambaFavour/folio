import { useState } from "react";
import { View, Text, TouchableOpacity, Switch, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { COLORS, FONTS } from "@/lib/theme";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [webDefault, setWebDefault] = useState(false);
  const [showCitations, setShowCitations] = useState(true);

  const name = user?.user_metadata?.full_name ?? "Student";
  const email = user?.email ?? "";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const Row = ({ label, sub, value, onChange }: any) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sub && <Text style={styles.toggleSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.border, true: COLORS.accent }}
        thumbColor="#fff"
      />
    </View>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          {user?.user_metadata?.avatar_url ? null : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>
        <View style={styles.googleBadge}>
          <Text style={styles.googleBadgeText}>G Google</Text>
        </View>
      </View>

      <Section title="AI BEHAVIOUR">
        <Row
          label="Web search by default"
          sub="Search internet when PDFs don't have the answer"
          value={webDefault}
          onChange={setWebDefault}
        />
        <View style={styles.divider} />
        <Row
          label="Show citations"
          sub="Display PDF source and page number in answers"
          value={showCitations}
          onChange={setShowCitations}
        />
      </Section>

      <Section title="DATA & PRIVACY">
        {[
          { label: "Export my data", icon: "⬇️" },
          { label: "Clear question history", icon: "🗑️", danger: false },
          { label: "Delete account", icon: "⚠️", danger: true },
        ].map((item, i) => (
          <View key={item.label}>
            {i > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => Alert.alert(item.label, "This feature is coming soon.")}
            >
              <Text style={styles.actionIcon}>{item.icon}</Text>
              <Text style={[styles.actionLabel, item.danger && { color: COLORS.red }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </Section>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Folio v1.0.0 · Made for students</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingBottom: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.5 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, margin: 16, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accent, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: FONTS.bold },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
  profileEmail: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  googleBadge: { backgroundColor: COLORS.greenLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  googleBadgeText: { fontSize: 11, fontFamily: FONTS.semibold, color: COLORS.green },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: FONTS.semibold, color: COLORS.textMuted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, paddingHorizontal: 2 },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  toggleRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 16 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text },
  toggleSub: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: 16 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  actionIcon: { fontSize: 18 },
  actionLabel: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text },
  signOutBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 15, alignItems: "center" },
  signOutText: { fontSize: 15, fontFamily: FONTS.semibold, color: COLORS.red },
  version: { textAlign: "center", fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textLight, paddingBottom: 20 },
});
