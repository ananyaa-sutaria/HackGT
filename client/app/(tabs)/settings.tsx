// app/(tabs)/settings.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  TextInput, FlatList, Switch, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { clearToken } from '../../src/lib/auth';
import { meApi, BASE as API_BASE, ping, resetApi } from '../../src/lib/api';

type MeShape = { ok?: boolean; user?: { email?: string }; email?: string } | null;

const NAME_KEY   = 'profile_name';
const EMOJI_KEY  = 'profile_emoji';
const BUDGET_KEY = 'budget_monthly';
const LOCK_KEY   = 'app_lock_enabled';

const EMOJIS = ['👤','👩🏻‍💻','🧑🏽‍💻','🪪','🚀','💳','💡','💼','🐻','🦊','🦄','🌊'];

function initialsFrom(source: string) {
  const base = (source || '').trim();
  if (!base) return 'U';
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const emailUser = base.includes('@') ? base.split('@')[0] : base;
  return emailUser.slice(0, 2).toUpperCase();
}
function prettifyNameFromEmail(mail?: string) {
  if (!mail) return '';
  const local = mail.split('@')[0];
  return local.replace(/[._-]+/g, ' ').split(' ').filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
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

  // budget
  const [budgetStr, setBudgetStr] = useState('');

  // lock
  const [lockEnabled, setLockEnabled] = useState(false);
  const [supportsLock, setSupportsLock] = useState<boolean | null>(null);

  const email = useMemo(
    () => me?.user?.email ?? me?.email ?? 'demo@subsense.app',
    [me]
  );

  // Load everything
  useEffect(() => {
    (async () => {
      try {
        const meResp = await meApi().catch(() => null);
        setMe(meResp);

        const [savedName, savedEmoji, savedBudget, savedLock] = await Promise.all([
          AsyncStorage.getItem(NAME_KEY),
          AsyncStorage.getItem(EMOJI_KEY),
          AsyncStorage.getItem(BUDGET_KEY),
          AsyncStorage.getItem(LOCK_KEY),
        ]);

        setName(savedName || prettifyNameFromEmail(meResp?.user?.email ?? meResp?.email ?? ''));
        setEmoji(savedEmoji || '');
        setBudgetStr(savedBudget || '');

        // lock support
        const hw = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setSupportsLock(hw && enrolled);
        setLockEnabled(savedLock === '1');
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

  async function onSaveBudget() {
    const clean = (budgetStr || '').replace(/[^0-9.]/g, '');
    await AsyncStorage.setItem(BUDGET_KEY, clean);
    Alert.alert('Saved', `Monthly budget set to $${clean || '0'}.`);
  }

  async function toggleLock(value: boolean) {
    if (!supportsLock) {
      Alert.alert('Unavailable', 'Biometrics/Passcode not set up on this device.');
      return;
    }
    if (value) {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable App Lock',
        cancelLabel: 'Cancel',
      });
      if (!res.success) return;
      await AsyncStorage.setItem(LOCK_KEY, '1');
      setLockEnabled(true);
    } else {
      await AsyncStorage.removeItem(LOCK_KEY);
      setLockEnabled(false);
    }
  }

  async function tryLockNow() {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock SubSense',
      cancelLabel: 'Cancel',
    });
    Alert.alert(res.success ? 'Unlocked' : 'Failed', res.success ? 'Authentication successful.' : 'Could not authenticate.');
  }

  async function onPing() {
    try {
      const r = await ping();
      Alert.alert('API OK', JSON.stringify(r));
    } catch (e: any) {
      Alert.alert('API Error', e?.message || 'Failed to reach server.');
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

      {/* Profile */}
      <View className="card" style={s.card}>
        <View style={s.row}>
          <View style={s.avatar}><Text style={s.avatarText}>{avatarContent}</Text></View>
          <View style={{ flex:1 }}>
            {!editing ? (
              <>
                <Text style={s.name}>{name || prettifyNameFromEmail(email)}</Text>
                <Text style={s.subtle}>{email}</Text>
              </>
            ) : (
              <>
                <Text style={s.label}>Display name</Text>
                <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name" />
              </>
            )}
          </View>
          {!editing ? (
            <Pressable style={s.linkBtn} onPress={() => setEditing(true)}>
              <Text style={s.linkBtnText}>Edit</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection:'row', gap:8 }}>
              <Pressable onPress={() => setEditing(false)} style={s.outlineBtn}>
                <Text style={s.outlineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onSaveProfile} disabled={saving} style={[s.primaryBtn, saving && { opacity:0.6 }]}>
                <Text style={s.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {editing && (
          <View style={{ marginTop:12 }}>
            <Text style={s.label}>Choose an icon</Text>
            <FlatList
              data={EMOJIS}
              keyExtractor={(it) => it}
              numColumns={6}
              columnWrapperStyle={{ justifyContent:'flex-start', gap:8 }}
              contentContainerStyle={{ gap:8, marginTop:8 }}
              renderItem={({ item }) => {
                const selected = item === emoji;
                return (
                  <Pressable
                    onPress={() => setEmoji(item)}
                    style={[s.emojiCell, selected && { borderColor:'#0F62FE', backgroundColor:'#EEF4FF' }]}
                  >
                    <Text style={{ fontSize:20 }}>{item}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        )}
      </View>

      {/* Budget & Alerts */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Budget & Alerts</Text>
        <Text style={s.label}>Monthly subscription budget</Text>
        <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
          <Text style={s.prefix}>$</Text>
          <TextInput
            style={[s.input, { flex:1 }]}
            keyboardType="decimal-pad"
            value={budgetStr}
            onChangeText={setBudgetStr}
            placeholder="e.g., 50"
          />
          <Pressable onPress={onSaveBudget} style={s.primaryBtn}>
            <Text style={s.primaryBtnText}>Save</Text>
          </Pressable>
        </View>
        <Text style={s.hint}>Totals bar turns red if you exceed this.</Text>
      </View>

      {/* Security */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Security</Text>
        <View style={s.rowBetween}>
          <Text style={s.label}>App Lock (Face ID / Touch ID)</Text>
          <Switch value={lockEnabled} onValueChange={toggleLock} />
        </View>
        <Pressable onPress={tryLockNow} style={[s.outlineBtn, { marginTop:8 }]}>
          <Text style={s.outlineBtnText}>Try lock now</Text>
        </Pressable>
      </View>

      {/* Diagnostics */}
      <View style={s.card}>
  <Text style={s.sectionTitle}>Diagnostics</Text>
  <Row label="API base" value={API_BASE || '(unset)'} />
  <Pressable onPress={onPing} style={[s.outlineBtn, { marginTop:8 }]}>
    <Text style={s.outlineBtnText}>Ping API</Text>
  </Pressable>

  {/* New reset button */}
  <Pressable onPress={onResetApi} style={[s.logoutBtn, { marginTop:8, backgroundColor:'#f59e0b' }]}>
    <Text style={s.logoutText}>Reset API</Text>
  </Pressable>
</View>

    

      {/* Logout */}
      <Pressable onPress={onLogout} disabled={loggingOut} style={[s.logoutBtn, loggingOut && { opacity:0.6 }]}>
        <Text style={s.logoutText}>{loggingOut ? 'Logging out…' : 'Log out'}</Text>
      </Pressable>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.rowBetween}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}
async function onResetApi() {
  try {
    await resetApi();
    Alert.alert('Reset complete', 'Server overrides cleared. Pull to refresh on Subscriptions.');
  } catch (e: any) {
    Alert.alert('Reset failed', e?.message || 'Please try again.');
  }
}

const s = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#B5DAAF' },
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
  prefix:{ fontWeight:'700', marginLeft:2 },

  label:{ color:'#6B7280', marginBottom:4 },
  hint:{ color:'#6B7280', marginTop:8 },

  linkBtn:{ paddingVertical:6, paddingHorizontal:10, borderRadius:8, backgroundColor:'#EEF2FF' },
  linkBtnText:{ color:'#0F62FE', fontWeight:'700' },

  outlineBtn:{ paddingVertical:10, paddingHorizontal:14, borderRadius:10, borderWidth:1, borderColor:'#CBD5E1', alignItems:'center' },
  outlineBtnText:{ fontWeight:'700', color:'#111827' },

  primaryBtn:{ backgroundColor:'#0F62FE', paddingVertical:10, paddingHorizontal:14, borderRadius:10, alignItems:'center' },
  primaryBtnText:{ color:'#fff', fontWeight:'700' },

  emojiCell:{ width:44, height:44, borderRadius:12, borderWidth:1, borderColor:'#E5E7EB', alignItems:'center', justifyContent:'center' },

  value:{ fontWeight:'700', color:'#111827', maxWidth:190 },

  logoutBtn:{ backgroundColor:'#EF4444', paddingVertical:14, borderRadius:10, alignItems:'center', marginTop:12 },
  logoutText:{ color:'#fff', fontWeight:'700' },
});
