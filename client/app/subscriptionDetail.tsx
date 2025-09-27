import { useLocalSearchParams } from 'expo-router';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { simulateCancel } from '../src/lib/api';

export default function SubscriptionDetailScreen() {
  const { accountId, sub } = useLocalSearchParams<{ accountId: string; sub: string }>();
  const subscription = JSON.parse(sub || '{}');

  const handleCancel = async () => {
    try {
      await simulateCancel({
        fromAccountId: accountId!,
        toAccountId: accountId!, // In real app, this would be a savings account
        amount: subscription.amount,
      });
      Alert.alert('Success', `Simulated cancellation of ${subscription.merchant}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to simulate cancellation');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{subscription.merchant}</Text>
      <Text style={styles.detail}>Amount: ${subscription.amount} / {subscription.cadence}</Text>
      <Text style={styles.detail}>Next Due: {subscription.nextDate}</Text>
      <Text style={styles.detail}>Annual Total: ${subscription.annualCost}</Text>

      <Pressable onPress={handleCancel} style={styles.button}>
        <Text style={styles.buttonText}>Simulate Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  detail: { fontSize: 16, marginVertical: 4 },
  button: {
    backgroundColor: '#0f62fe',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
