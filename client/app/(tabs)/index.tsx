import { getAccounts, provisionDemo } from '../../src/lib/api';
import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAccounts();
        if (!cancelled) setAccounts(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load accounts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 🔹 called by the ListEmptyComponent button
  const handleProvision = async () => {
    try {
      setLoading(true);
      await provisionDemo();
      const data = await getAccounts();
      setAccounts(data);
    } catch (e: any) {
      setError(e?.message || 'Provision failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Couldn’t load accounts</Text>
        <Text style={styles.errMsg}>{error}</Text>
        <Text style={styles.hint}>
          Check server is running and EXPO_PUBLIC_API_URL is reachable from this device.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select an Account</Text>
      <FlatList
        data={accounts}
        keyExtractor={(item, i) => item?._id ?? String(i)}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/subscriptions', params: { accountId: String(item._id) } }}
            asChild
          >
            <Pressable style={styles.card}>
              <Text style={styles.name}>{item.nickname || item.type}</Text>
              <Text>Balance: ${item.balance}</Text>
            </Pressable>
          </Link>
        )}
        // 🔻 EXACTLY HERE
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <Text>No accounts found.</Text>
            <Pressable onPress={handleProvision}
              style={{ backgroundColor: '#0f62fe', padding: 12, borderRadius: 10, marginTop: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                Create Demo Customer + Accounts
              </Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#B5DAAF' },
  title:{ fontSize:24, fontWeight:'bold', marginBottom:20 },
  card:{ padding:15, backgroundColor:'#f4f4f4', marginBottom:12, borderRadius:10 },
  name:{ fontSize:18, fontWeight:'600' },
  center:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  errTitle:{ fontSize:18, fontWeight:'700', marginBottom:8 },
  errMsg:{ color:'#b00020', textAlign:'center', marginBottom:8 },
  hint:{ color:'#666', textAlign:'center' },
});
