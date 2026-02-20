import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONTS } from "@/lib/theme";

function TabIcon({ focused, label, icon }: { focused: boolean; label: string; icon: string }) {
  return (
    <View style={styles.tab}>
      <Text style={[styles.icon, { opacity: focused ? 1 : 0.4 }]}>{icon}</Text>
      <Text style={[styles.label, { color: focused ? COLORS.text : COLORS.textLight, fontFamily: focused ? FONTS.semibold : FONTS.regular }]}>
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Home" icon="⌂" /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Search" icon="⌕" /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Profile" icon="◎" /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tab: { alignItems: "center", gap: 3 },
  icon: { fontSize: 22, color: COLORS.text },
  label: { fontSize: 10, letterSpacing: 0.3 },
});
