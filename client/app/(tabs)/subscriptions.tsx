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

import { scanSubscriptions, provisionDemo } from '../../src/lib/api';

type Sub = {
  merchant: string;
  amount: number;
  cadence: string; // e.g., 'monthly'
  nextDate?: string;
};

export default function SubscriptionsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();

  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
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

  const totals = useMemo(() => {
    const monthly = subs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    return { monthly, yearly: monthly * 12 };
  }, [subs]);

  const handleSeed = useCallback(async () => {
    try {
      setSeeding(true);
      // This endpoint provisions a demo customer + accounts
      // and seeds purchases on the Checking account in Nessie.
      const result = await provisionDemo();
      await load();

      // If this account still has no subs, let the user know to switch to Checking.
      Alert.alert(
        'Demo data ready',
        result?.message ??
          'Demo data created. If this account still looks empty, switch to your Checking account.'
      );
    } catch (e: any) {
      Alert.alert('Seed failed', String(e?.message || e));
    } finally {
      setSeeding(false);
    }
  }, [load]);

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
            <Text style={styles.line}>
              ${Number(item.amount).toFixed(2)} / {item.cadence}
            </Text>
            {item.nextDate ? <Text style={styles.line}>Next: {item.nextDate}</Text> : null}

            <View style={styles.row}>
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
              <Pressable
                onPress={handleSeed}
                disabled={seeding}
                style={[
                  styles.primaryBtn,
                  { marginTop: 12, opacity: seeding ? 0.6 : 1 },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {seeding ? 'Seeding…' : 'Create demo subscriptions'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  secondaryBtn:{ backgroundColor:'#0f62fe', paddingVertical:10, paddingHorizontal:14, borderRadius:10 },
  secondaryBtnText:{ color:'#fff', fontWeight:'700' },
  primaryBtn:{ backgroundColor:'#0f62fe', paddingVertical:12, paddingHorizontal:16, borderRadius:10 },
  primaryBtnText:{ color:'#fff', fontWeight:'700' },
  errTitle:{ fontSize:18, fontWeight:'700', marginBottom:8 },
  errMsg:{ color:'#b00020', textAlign:'center', marginBottom:12 },
  totalsBar:{ backgroundColor:'#f6f6f6', padding:10, borderRadius:10, marginBottom:12 },
  totalsText:{ fontWeight:'700', color:'#222', textAlign:'center' },
});
