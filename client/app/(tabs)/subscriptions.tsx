import { useEffect, useState, useCallback, useMemo } from 'react';
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
import {
  scanSubscriptions,
  seedDemoSubs,
  cancelSubscription,
} from '../../src/lib/api';

type Sub = {
  merchant: string;
  amount: number;
  cadence: 'monthly' | string;
  nextDate?: string;
};

export default function SubscriptionsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await scanSubscriptions(String(accountId));
      setSubs(Array.isArray(data) ? data : []);
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

  const handleSeed = useCallback(async () => {
    try {
      await seedDemoSubs(String(accountId));
      await load();
    } catch (e: any) {
      Alert.alert('Seed failed', e?.message || 'Please try again.');
    }
  }, [accountId, load]);

  const handleCancel = useCallback(
    async (merchant: string) => {
      try {
        await cancelSubscription(String(accountId), merchant);
        await load();
        Alert.alert('Canceled', `${merchant} removed`);
      } catch (e: any) {
        Alert.alert('Cancel failed', e?.message || 'Please try again.');
      }
    },
    [accountId, load]
  );

  const totals = useMemo(() => {
    const m = subs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const y = m * 12;
    return { monthly: m, yearly: y };
  }, [subs]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
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
      <View style={styles.totalsBar}>
        <Text style={styles.totalsText}>
          Potential savings: ${totals.monthly.toFixed(2)}/mo (${totals.yearly.toFixed(2)}/yr)
        </Text>
      </View>

      <Text style={styles.title}>Detected Subscriptions</Text>

      <FlatList
        data={subs}
        keyExtractor={(item, i) => `${item?.merchant ?? 'm'}-${i}`}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.merchant}</Text>
            <Text style={styles.line}>${item.amount} / {item.cadence}</Text>
            {item.nextDate ? <Text style={styles.line}>Next: {item.nextDate}</Text> : null}

            <View style={styles.row}>
              <Pressable onPress={() => handleCancel(item.merchant)} style={styles.dangerBtn}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>

              <Link
                href={{
                  pathname: '/subscriptionDetail',
                  params: { accountId: String(accountId), sub: JSON.stringify(item) },
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
            {accountId ? (
              <Pressable onPress={handleSeed} style={[styles.primaryBtn, { marginTop: 12 }]}>
                <Text style={styles.primaryBtnText}>Create demo subscriptions</Text>
              </Pressable>
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#fff' },
  center:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  title:{ fontSize:22, fontWeight:'700', marginBottom:12 },
  card:{ padding:16, backgroundColor:'#e9f0ff', marginBottom:12, borderRadius:12 },
  name:{ fontSize:18, fontWeight:'700', marginBottom:6 },
  line:{ color:'#333' },
  row:{ flexDirection:'row', gap:12, marginTop:12 },
  dangerBtn:{ backgroundColor:'#ff3b30', paddingVertical:10, paddingHorizontal:14, borderRadius:10 },
  btnText:{ color:'#fff', fontWeight:'700' },
  secondaryBtn:{ backgroundColor:'#0f62fe', paddingVertical:10, paddingHorizontal:14, borderRadius:10 },
  secondaryBtnText:{ color:'#fff', fontWeight:'700' },
  primaryBtn:{ backgroundColor:'#0f62fe', paddingVertical:12, paddingHorizontal:16, borderRadius:10 },
  primaryBtnText:{ color:'#fff', fontWeight:'700' },
  errTitle:{ fontSize:18, fontWeight:'700', marginBottom:8 },
  errMsg:{ color:'#b00020', textAlign:'center', marginBottom:12 },
  totalsBar:{ backgroundColor:'#f6f6f6', padding:10, borderRadius:10, marginBottom:12 },
  totalsText:{ fontWeight:'700', color:'#222', textAlign:'center' },
});
