import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

function RouteGuard() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/landing");
    } else if (session && inAuthGroup) {
      router.replace("/(app)/dashboard");
    }
  }, [session, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RouteGuard />
    </AuthProvider>
  );
}