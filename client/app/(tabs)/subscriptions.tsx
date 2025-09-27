import { useEffect, useState } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { scanSubscriptions } from '../../src/lib/api';

export default function SubscriptionsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountId) {
      scanSubscriptions(accountId).then(data => {
        setSubs(data);
        setLoading(false);
      });
    }
  }, [accountId]);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detected Subscriptions</Text>
      <FlatList
        data={subs}
        keyExtractor={(item, index) => `${item.merchant}-${index}`}
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: '/subscriptionDetail',
              params: {
                accountId: String(accountId),
                sub: JSON.stringify(item)
              }
            }}
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
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: {
    padding: 15,
    backgroundColor: '#e9f0ff',
    marginBottom: 12,
    borderRadius: 10,
  },
  name: { fontSize: 18, fontWeight: '600' },
});
