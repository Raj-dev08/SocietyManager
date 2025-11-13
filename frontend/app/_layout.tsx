import { Stack, useRouter  } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export default function RootLayout() {
  const { checkAuth, user, isCheckingAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isCheckingAuth) return;

    
    if (!user) {
      setTimeout(() => {
        router.replace("/(auth)/signup");
      }, 0);
    } else {
      setTimeout(() => {
        router.replace("/(tabs)/auth");
      }, 0);
    }
  }, [isCheckingAuth]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}
