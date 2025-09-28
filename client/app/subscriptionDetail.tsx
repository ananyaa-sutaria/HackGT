// app/subscriptionDetail.tsx
import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  cancelSubscription,
  resumeSubscription,
  snoozeSubscription,
} from '../src/lib/api';
import { emit } from '../src/lib/bus';


type Sub = {
  merchant?: string;
  amount?: number | string;
  cadence?: string;
  nextDate?: string;
};

export default function SubscriptionDetail() {
  const { sub, accountId } = useLocalSearchParams<{ sub?: string; accountId?: string }>();

  // Parse the `sub` param (JSON from the list screen)
  const subData: Sub | null = useMemo(() => {
    try {
      if (!sub) return null;
      const raw = Array.isArray(sub) ? sub[0] : sub;
      return JSON.parse(raw) as Sub;
    } catch {
      return null;
    }
  }, [sub]);

  // Compute monthly/annual display
  const { merchant, monthly, annual, nextDate, cadenceLabel } = useMemo(() => {
    const m = (subData?.merchant || 'Subscription') as string;
    const amt = cleanAmount(subData?.amount);
    const cad = (subData?.cadence || 'monthly').toLowerCase();
    const perMonth = toMonthly(amt, cad);
    return {
      merchant: m,
      monthly: perMonth,
      annual: perMonth * 12,
      nextDate: subData?.nextDate,
      cadenceLabel: cad,
    };
  }, [subData]);

  async function onCancel() {
    if (!accountId || !subData?.merchant) return Alert.alert('Missing info');
    const amt = Number(String(subData.amount).replace(/[^0-9.\-]/g,'')) || 0;
  
    await cancelSubscription({ accountId: String(accountId), merchant: subData.merchant!, amount: amt });
  
    // 🔔 Optimistic update
    emit('sub:cancelled', { accountId: String(accountId), merchant: subData.merchant!, amount: amt });
  
    Alert.alert('Cancelled', `${subData.merchant} removed.`);
    router.back();
  }
  
  async function onResume() {
    if (!accountId || !subData?.merchant) return Alert.alert('Missing info');
    const amt = Number(String(subData.amount).replace(/[^0-9.\-]/g,'')) || 0;
  
    await resumeSubscription({ accountId: String(accountId), merchant: subData.merchant!, amount: amt });
  
    // Optional: optimistic add back (your list will also refetch)
    emit('sub:resumed', { accountId: String(accountId), merchant: subData.merchant!, amount: amt });
  
    Alert.alert('Re-subscribed', `${subData.merchant} re-enabled.`);
    router.back();
  }
  
  async function onSnooze() {
    if (!accountId || !subData?.merchant) return Alert.alert('Missing info');
    const amt = Number(String(subData.amount).replace(/[^0-9.\-]/g,'')) || 0;
  
    const r = await snoozeSubscription({ accountId: String(accountId), merchant: subData.merchant!, amount: amt, days: 30 });
  
    // Optional: optimistic nextDate update
    emit('sub:snoozed', { accountId: String(accountId), merchant: subData.merchant!, amount: amt, nextDate: r?.nextDate });
  
    Alert.alert('Snoozed', `Next charge pushed to ${r?.nextDate || 'later'}.`);
    router.back();
  }

  if (!subData) {
    return (
      <View style={s.center}>
        <Text style={s.err}>No subscription data provided.</Text>
        <Pressable onPress={() => router.back()} style={s.secondaryBtn}>
          <Text style={s.secondaryBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Text style={s.back}>← Back</Text>
      </Pressable>

      <Text style={s.title}>{merchant}</Text>
      <Text style={s.subtitle}>
        {fmt(monthly)} / mo  ({fmt(annual)} / yr)
      </Text>

      <View style={s.card}>
        <Row label="Plan cadence" value={prettyCadence(cadenceLabel)} />
        <Row label="Plan price"   value={fmt(cleanAmount(subData.amount))} />
        <Row label="Next due"     value={nextDate || '—'} />
      </View>

      <View style={s.actions}>
        <Pressable style={s.primaryBtn} onPress={onCancel}>
          <Text style={s.primaryBtnText}>Cancel</Text>
        </Pressable>
        <Pressable style={s.secondaryBtn} onPress={onResume}>
          <Text style={s.secondaryBtnText}>Re-subscribe</Text>
        </Pressable>
        <Pressable style={s.tertiaryBtn} onPress={onSnooze}>
          <Text style={s.tertiaryBtnText}>Snooze 30 days</Text>
        </Pressable>
      </View>
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
function fmt(v: number) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
}
function prettyCadence(c: string) {
  const map: Record<string,string> = {
    monthly: 'Monthly',
    yearly: 'Yearly',
    annual: 'Yearly',
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    quarterly: 'Quarterly',
  };
  return map[c] || c[0]?.toUpperCase() + c.slice(1);
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

/* ---------- styles ---------- */
const s = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#B5DAAF' },
  center:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  back:{ color:'E4A8B8', marginBottom:18, fontWeight:'600', fontSize:14 },
  title:{ fontSize:28, fontWeight:'800' },
  subtitle:{ color:'#374151', marginTop:4, marginBottom:16, fontWeight:'600' },
  card:{ backgroundColor:'#FFF8ED', borderRadius:12, padding:16, borderWidth:5, borderColor:'#E4A8B8' },
  row:{ flexDirection:'row', justifyContent:'space-between', marginBottom:10 },
  rowLabel:{ color:'#6B7280' },
  rowValue:{ color:'#111827', fontWeight:'600' },
  actions:{ flexDirection:'row', gap:10, marginTop:16, flexWrap:'wrap' },
  primaryBtn:{ backgroundColor:'#E4A8B8', paddingVertical:12, paddingHorizontal:16, borderRadius:10 },
  primaryBtnText:{ color:'#FFF8ED', fontWeight:'700' },
  secondaryBtn:{ backgroundColor:'#E4A8B8', paddingVertical:10, paddingHorizontal:14, borderRadius:10 },
  secondaryBtnText:{ color:'#FFF8ED', fontWeight:'700' },
  tertiaryBtn:{ backgroundColor:'#E4A8B8', paddingVertical:10, paddingHorizontal:14, borderRadius:10 },
  tertiaryBtnText:{ color:'#FFF8ED', fontWeight:'700' },
  err:{ color:'#b00020', marginBottom:8 },
});
