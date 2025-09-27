import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { clearToken } from '../../src/lib/auth';
import { meApi } from '../../src/lib/api';

type MeShape = { ok?: boolean; user?: { email?: string }; email?: string } | null;

export default function Settings() {
  const [me, setMe] = useState<MeShape>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    (async () => {
      try { setMe(await meApi()); } catch { setMe(null); }
      setLoading(false);
    })();
  }, []);

  const onLogout = async () => {
    setLoggingOut(true);
    await clearToken();
    router.replace('/login' as any);
  };

  if (loading) return <View style={s.center}><ActivityIndicator /></View>;

  const email = me?.user?.email ?? me?.email ?? 'demo@subsense.app';

  return (
    <View style={s.container}>
      <Text style={s.title}>Settings</Text>

      <View style={s.card}>
        <Text style={s.label}>Signed in as</Text>
        <Text style={s.value}>{email}</Text>
      </View>

      <Pressable onPress={onLogout} disabled={loggingOut} style={[s.logoutBtn, loggingOut && { opacity: 0.6 }]}>
        <Text style={s.logoutText}>{loggingOut ? 'Logging out…' : 'Log out'}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#fff' },
  center:{ flex:1, alignItems:'center', justifyContent:'center' },
  title:{ fontSize:22, fontWeight:'800', marginBottom:16 },
  card:{ backgroundColor:'#F8FAFC', borderRadius:12, padding:16, borderWidth:1, borderColor:'#E5E7EB', marginBottom:16 },
  label:{ color:'#6B7280', marginBottom:4 },
  value:{ fontWeight:'700', color:'#111827' },
  logoutBtn:{ backgroundColor:'#EF4444', paddingVertical:14, borderRadius:10, alignItems:'center' },
  logoutText:{ color:'#fff', fontWeight:'700' },
});
