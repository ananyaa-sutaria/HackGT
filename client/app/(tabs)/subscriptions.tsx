// app/(tabs)/subscriptions.tsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scanSubscriptions, provisionDemo } from '../../src/lib/api';

type Sub = {
  merchant: string;
  amount: number | string;
  cadence?: string;   // 'monthly' | 'yearly' | 'weekly' | 'biweekly' | 'quarterly' | etc.
  nextDate?: string;
};

const BUDGET_KEY = 'budget_monthly';

export default function SubscriptionsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();

  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);

  // Load budget once
  useEffect(() => {
    (async () => {
      const b = await AsyncStorage.getItem(BUDGET_KEY);
      setBudget(b ? Number(b) || 0 : null);
    })();
  }, []);

  // Loader
  const load = useCallback(async () => {
    if (!accountId) {
      setLoading(false);
      setError('No account selected. Go to Accounts and pick one.');
      return;
    }
    try {
      setError(null);
      const data = await scanSubscriptions(String(accountId));
      const clean = (Array.isArray(data) ? data : []).map((s: any) => ({
        merchant: s?.merchant ?? 'Unknown',
        amount: cleanAmount(s?.amount),
        cadence: String(s?.cadence ?? 'monthly').toLowerCase(),
        nextDate: s?.nextDate,
      })) as Sub[];
      setSubs(clean);
    } catch (e: any) {
      setError(e?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accountId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // Totals
  const totals = useMemo(() => {
    const monthly = subs.reduce((sum, s) => sum + toMonthly(cleanAmount(s.amount), s.cadence), 0);
    return { monthly, annual: monthly * 12 };
  }, [subs]);

  const overBudget = budget != null && totals.monthly > budget;

  // Demo seeding fallback (for judging)
  const handleSeed = useCallback(async () => {
    try {
      await provisionDemo();
      await load();
      if (!subs.length) {
        Alert.alert('Demo created', 'Seeded sample subscriptions. If this account is empty, switch to your Checking account.');
      }
    } catch (e: any) {
      Alert.alert('Seed failed', e?.message || 'Please try again.');
    }
  }, [load, subs.length]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Couldn’t load subscriptions</Text>
        <Text style={styles.errMsg}>{error}</Text>
        <Pressable style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Totals bar */}
      <View style={[styles.totalsBar, overBudget && styles.totalsBarOver]}>
        <Text style={[styles.totalsText, overBudget && styles.totalsTextOver]}>
          Total: {fmt(totals.monthly)} / mo  ({fmt(totals.annual)} / yr)
          {budget != null ? `  •  Budget: $${(budget ?? 0).toFixed(2)}` : ''}
        </Text>
      </View>

      <Text style={styles.title}>Detected Subscriptions</Text>

      <FlatList
        data={subs}
        keyExtractor={(item, i) => `${item?.merchant ?? 'm'}-${i}`}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.merchant}</Text>
            <Text style={styles.line}>
              {fmt(cleanAmount(item.amount))} / {prettyCadence(item.cadence)}
            </Text>
            {item.nextDate ? <Text style={styles.line}>Next: {item.nextDate}</Text> : null}

            <View style={{ marginTop: 10 }}>
              <Link
                href={{
                  pathname: '/subscriptionDetail',
                  params: { accountId: String(accountId ?? ''), sub: JSON.stringify(item) },
                }}
                asChild
              >
                <Pressable style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Details</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <Text>No subscriptions detected.</Text>
            <Pressable onPress={handleSeed} style={[styles.primaryBtn, { marginTop: 12 }]}>
              <Text style={styles.primaryBtnText}>Create demo subscriptions</Text>
            </Pressable>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

/* ---------- helpers ---------- */

function cleanAmount(a: any) {
  if (typeof a === 'string') return Number(a.replace(/[^0-9.\-]/g, '')) || 0;
  return Number(a) || 0;
}

function toMonthly(amount: number, cadence?: string) {
  const c = (cadence || 'monthly').toLowerCase();
  switch (c) {
    case 'weekly':    return (amount * 52) / 12;
    case 'biweekly':  return (amount * 26) / 12;
    case 'quarterly': return amount / 3;
    case 'yearly':
    case 'annual':    return amount / 12;
    case 'monthly':
    default:          return amount;
  }
}

function prettyCadence(c?: string) {
  const k = (c || 'monthly').toLowerCase();
  const map: Record<string, string> = {
    monthly: 'monthly',
    yearly: 'yearly',
    annual: 'yearly',
    weekly: 'weekly',
    biweekly: 'every 2 weeks',
    quarterly: 'quarterly',
  };
  return map[k] || k;
}

function fmt(v: number) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#B5DAAF' },
  center:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  title:{ fontSize:22, fontWeight:'700', marginBottom:12 },

  totalsBar:{ backgroundColor:'#f6f6f6', padding:10, borderRadius:10, marginBottom:12 },
  totalsText:{ fontWeight:'700', color:'#222', textAlign:'center' },
  totalsBarOver:{ backgroundColor:'#fee2e2', borderColor:'#fecaca', borderWidth:1 },
  totalsTextOver:{ color:'#991b1b' },

  card:{ padding:16, backgroundColor:'#e9f0ff', marginBottom:12, borderRadius:12 },
  name:{ fontSize:18, fontWeight:'700', marginBottom:6 },
  line:{ color:'#333' },

  secondaryBtn:{ backgroundColor:'#0f62fe', paddingVertical:10, paddingHorizontal:14, borderRadius:10, alignItems:'center', alignSelf:'flex-start' },
  secondaryBtnText:{ color:'#fff', fontWeight:'700' },

  primaryBtn:{ backgroundColor:'#0f62fe', paddingVertical:12, paddingHorizontal:16, borderRadius:10 },
  primaryBtnText:{ color:'#fff', fontWeight:'700' },

  errTitle:{ fontSize:18, fontWeight:'700', marginBottom:8 },
  errMsg:{ color:'#b00020', textAlign:'center', marginBottom:12 },
});
