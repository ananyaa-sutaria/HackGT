import { getAccounts } from '../../src/lib/api';
import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAccounts().then(data => {
      setAccounts(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select an Account</Text>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: '/subscriptions',
              params: { accountId: String(item._id) }
            }}
            asChild
          >
            <Pressable style={styles.card}>
              <Text style={styles.name}>{item.nickname || item.type}</Text>
              <Text>Balance: ${item.balance}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: {
    padding: 15,
    backgroundColor: '#f4f4f4',
    marginBottom: 12,
    borderRadius: 10,
  },
  name: { fontSize: 18, fontWeight: '600' },
});
