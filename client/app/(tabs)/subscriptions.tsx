import { useEffect, useState } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { scanSubscriptions } from '../../src/lib/api';

export default function SubscriptionsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await scanSubscriptions(String(accountId));
        if (!cancelled) setSubs(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load subscriptions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accountId]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Couldn’t load subscriptions</Text>
        <Text style={styles.errMsg}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detected Subscriptions</Text>
      <FlatList
        data={subs}
        keyExtractor={(item, i) => `${item?.merchant ?? 'm'}-${i}`}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/subscriptionDetail', params: { accountId: String(accountId), sub: JSON.stringify(item) } }}
            asChild
          >
            <Pressable style={styles.card}>
              <Text style={styles.name}>{item.merchant}</Text>
              <Text>${item.amount} / {item.cadence}</Text>
              <Text>Next Due: {item.nextDate}</Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={<Text>No subscriptions detected.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#fff' },
  title:{ fontSize:24, fontWeight:'bold', marginBottom:20 },
  card:{ padding:15, backgroundColor:'#e9f0ff', marginBottom:12, borderRadius:10 },
  name:{ fontSize:18, fontWeight:'600' },
  center:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  errTitle:{ fontSize:18, fontWeight:'700', marginBottom:8 },
  errMsg:{ color:'#b00020', textAlign:'center' },
});
