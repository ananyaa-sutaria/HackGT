import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E4A8B8',
        tabBarInactiveTintColor: '#A3A3A3',
      }}
    >
    <Tabs.Screen 
      name="index"         
      options={{ 
        title: 'Accounts',
        tabBarIcon: ({ color, size }) => <Ionicons name="wallet" color={color} size={25} />,
      }} 
    />
    <Tabs.Screen 
      name="subscriptions" 
      options={{ 
        title: 'Subscriptions', 
        tabBarIcon: ({ color, size }) => <Ionicons name="cart" color={color} size={25} />,
      }} 
    />
    <Tabs.Screen
      name="settings"
      options={{
        title: 'Settings',
        tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={25} />,
      }}
    />
    </Tabs>
  );
}
