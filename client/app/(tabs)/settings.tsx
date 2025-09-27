// app/(tabs)/settings.tsx
import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { clearToken } from '../../src/lib/auth';
import { meApi } from '../../src/lib/api';

type MeShape = { ok?: boolean; user?: { email?: string }; email?: string } | null;

const NAME_KEY  = 'profile_name';
const EMOJI_KEY = 'profile_emoji';
const EMOJIS = ['👤','👩🏻‍💻','🧑🏽‍💻','🪪','🚀','💳','💡','💼','🐻','🦊','🦄','🌊'];

function initialsFrom(source: string) {
  const base = (source || '').trim();
  if (!base) return 'U';
  // Try words first (e.g., "Anya Sutaria" -> "AS")
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  // Fallback: from email (before @)
  const emailUser = base.includes('@') ? base.split('@')[0] : base;
  return emailUser.slice(0, 2).toUpperCase();
}

export default function Settings() {
  const [me, setMe] = useState<MeShape>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // profile
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const email = useMemo(
    () => me?.user?.email ?? me?.email ?? 'demo@subsense.app',
    [me]
  );

  // Load server identity + saved profile
  useEffect(() => {
    (async () => {
      try {
        const meResp = await meApi().catch(() => null);
        setMe(meResp);
        const savedName  = (await AsyncStorage.getItem(NAME_KEY))  || '';
        const savedEmoji = (await AsyncStorage.getItem(EMOJI_KEY)) || '';
        setName(savedName || prettifyNameFromEmail(meResp?.user?.email ?? meResp?.email ?? ''));
        setEmoji(savedEmoji);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSaveProfile() {
    try {
      setSaving(true);
      await AsyncStorage.setItem(NAME_KEY, name.trim());
      await AsyncStorage.setItem(EMOJI_KEY, emoji);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    await clearToken();
    router.replace('/login' as any);
  }

  const avatarContent = emoji || initialsFrom(name || email);

  if (loading) {
    return <View style={s.center}><ActivityIndicator /></View>;
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Settings</Text>

      {/* Profile Card */}
      <View style={s.card}>
        <View style={s.row}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{avatarContent}</Text>
          </View>

          <View style={{ flex: 1 }}>
            {!editing ? (
              <>
                <Text style={s.name}>{name || prettifyNameFromEmail(email)}</Text>
                <Text style={s.subtle}>{email}</Text>
              </>
            ) : (
              <>
                <Text style={s.label}>Display name</Text>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                />
              </>
            )}
          </View>

          {!editing ? (
            <Pressable style={s.linkBtn} onPress={() => setEditing(true)}>
              <Text style={s.linkBtnText}>Edit</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => { setEditing(false); }}
                style={[s.outlineBtn]}
              >
                <Text style={s.outlineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onSaveProfile}
                disabled={saving}
                style={[s.primaryBtn, saving && { opacity: 0.6 }]}
              >
                <Text style={s.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {editing && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Choose an icon</Text>
            <FlatList
              data={EMOJIS}
              keyExtractor={(it) => it}
              numColumns={6}
              columnWrapperStyle={{ justifyContent: 'flex-start', gap: 8 }}
              contentContainerStyle={{ gap: 8, marginTop: 8 }}
              renderItem={({ item }) => {
                const selected = item === emoji;
                return (
                  <Pressable
                    onPress={() => setEmoji(item)}
                    style={[
                      s.emojiCell,
                      selected && { borderColor: '#0F62FE', backgroundColor: '#EEF4FF' }
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>{item}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        )}
      </View>

      {/* Account section (read-only info) */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Account</Text>
        <Row label="Signed in" value={email} />
      </View>

      {/* Danger / Logout */}
      <Pressable onPress={onLogout} disabled={loggingOut} style={[s.logoutBtn, loggingOut && { opacity: 0.6 }]}>
        <Text style={s.logoutText}>{loggingOut ? 'Logging out…' : 'Log out'}</Text>
      </Pressable>
    </View>
  );
}

function prettifyNameFromEmail(mail?: string) {
  if (!mail) return '';
  const local = mail.split('@')[0];
  // Replace separators with spaces and capitalize each word
  return local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.rowBetween}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#fff' },
  center:{ flex:1, alignItems:'center', justifyContent:'center' },
  title:{ fontSize:22, fontWeight:'800', marginBottom:16 },

  card:{ backgroundColor:'#F8FAFC', borderRadius:12, padding:16, borderWidth:1, borderColor:'#E5E7EB', marginBottom:16 },
  row:{ flexDirection:'row', alignItems:'center', gap:12 },
  rowBetween:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:8 },

  avatar:{ width:64, height:64, borderRadius:32, backgroundColor:'#EEF2FF', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#E5E7EB' },
  avatarText:{ fontSize:28, fontWeight:'700' },

  name:{ fontSize:18, fontWeight:'800' },
  subtle:{ color:'#6B7280' },

  sectionTitle:{ fontWeight:'800', marginBottom:8 },

  input:{ borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, padding:10, marginTop:4 },

  label:{ color:'#6B7280', marginBottom:4 },

  linkBtn:{ paddingVertical:6, paddingHorizontal:10, borderRadius:8, backgroundColor:'#EEF2FF' },
  linkBtnText:{ color:'#0F62FE', fontWeight:'700' },

  outlineBtn:{ paddingVertical:10, paddingHorizontal:14, borderRadius:10, borderWidth:1, borderColor:'#CBD5E1' },
  outlineBtnText:{ fontWeight:'700', color:'#111827' },

  primaryBtn:{ backgroundColor:'#0F62FE', paddingVertical:10, paddingHorizontal:14, borderRadius:10 },
  primaryBtnText:{ color:'#fff', fontWeight:'700' },

  emojiCell:{ width:44, height:44, borderRadius:12, borderWidth:1, borderColor:'#E5E7EB', alignItems:'center', justifyContent:'center' },

  value:{ fontWeight:'700', color:'#111827' },

  logoutBtn:{ backgroundColor:'#EF4444', paddingVertical:14, borderRadius:10, alignItems:'center', marginTop:12 },
  logoutText:{ color:'#fff', fontWeight:'700' },
});
