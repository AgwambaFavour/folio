import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/hooks/useAuth";
import { COLORS, FONTS } from "@/lib/theme";

const { height } = Dimensions.get("window");

export default function LandingScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert("Sign in failed", err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Subtle dot-grid background */}
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: 12 }).map((_, row) =>
          Array.from({ length: 8 }).map((_, col) => (
            <View key={`${row}-${col}`} style={[styles.dot, { top: row * 72, left: col * 50 }]} />
          ))
        )}
      </View>

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>f</Text>
          </View>
          <Text style={styles.logoText}>folio</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Study smarter</Text>
          <Text style={styles.headline}>Your notes,{"\n"}finally smart.</Text>
          <Text style={styles.subheadline}>
            Upload your PDFs, ask anything. Folio finds the answer in your own study materials — or searches the web when needed.
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.features}>
          {[
            { icon: "📄", text: "PDF-powered answers with citations" },
            { icon: "🔍", text: "Web search fallback toggle" },
            { icon: "📂", text: "Separate channels per subject" },
          ].map((f, i) => (
            <View key={i} style={styles.featurePill}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.privacyNote}>Your data is private. Collaborate later.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  grid: { position: "absolute", inset: 0, overflow: "hidden" },
  dot: { position: "absolute", width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.border },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 12, paddingBottom: 28, justifyContent: "space-between" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.accent, justifyContent: "center", alignItems: "center" },
  logoLetter: { color: "#fff", fontSize: 22, fontFamily: FONTS.bold },
  logoText: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.5 },
  hero: { gap: 14 },
  eyebrow: { fontSize: 11, fontFamily: FONTS.semibold, color: COLORS.textMuted, letterSpacing: 2, textTransform: "uppercase" },
  headline: { fontSize: 40, fontFamily: FONTS.bold, color: COLORS.text, lineHeight: 46, letterSpacing: -1 },
  subheadline: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textMuted, lineHeight: 24, maxWidth: 300 },
  features: { gap: 10 },
  featurePill: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  featureIcon: { fontSize: 18 },
  featureText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text, flex: 1 },
  cta: { gap: 12 },
  googleBtn: { backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  googleBtnDisabled: { opacity: 0.6 },
  googleIcon: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
  googleBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.semibold, letterSpacing: -0.3 },
  privacyNote: { textAlign: "center", fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textLight },
});
