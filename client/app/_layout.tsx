// app/_layout.tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, Redirect, usePathname } from 'expo-router';
import { getToken } from '../src/lib/auth';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await getToken();
        if (mounted) setAuthed(Boolean(t));
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [pathname]);

  if (!ready) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Allow visiting login unauth'd. Support both '/login' and '/(auth)/login' if you ever group it.
  const isLogin =
    pathname === '/login' || pathname === '/(auth)/login';

  // Not authed and not on login → go to login
  if (!authed && !isLogin) {
    // Cast to any to avoid TS error until routes regenerate after you add app/login.tsx
    return <Redirect href={'/login' as any} />;
  }

  // Authed and on login → send to app root (tabs)
  if (authed && isLogin) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      {/* Main tabs at "/" */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Detail screen */}
      <Stack.Screen name="subscriptionDetail" options={{ title: 'Subscription Detail' }} />
      {/* Public login route */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}
