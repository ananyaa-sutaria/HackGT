import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index"         options={{ title: 'Accounts' }} />
      <Tabs.Screen name="subscriptions" options={{ title: 'Subscriptions' }} />
    </Tabs>
  );
}
