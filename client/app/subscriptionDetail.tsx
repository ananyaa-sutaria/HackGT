// app/subscriptionDetail.tsx
import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  cancelSubscription,
  resumeSubscription,
  snoozeSubscription,
} from '../src/lib/api';

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
    if (!accountId || !subData?.merchant) {
      return Alert.alert('Missing info', 'No account or merchant found.');
    }
    try {
      await cancelSubscription({
        accountId: String(accountId),
        merchant: subData.merchant!,
        amount: cleanAmount(subData.amount),
      });
      Alert.alert('Cancelled', `${subData.merchant} has been cancelled.`);
      router.back();
    } catch (e: any) {
      Alert.alert('Cancel failed', e?.message || 'Please try again.');
    }
  }

  async function onResume() {
    if (!accountId || !subData?.merchant) {
      return Alert.alert('Missing info', 'No account or merchant found.');
    }
    try {
      await resumeSubscription({
        accountId: String(accountId),
        merchant: subData.merchant!,
        amount: cleanAmount(subData.amount),
      });
      Alert.alert('Re-subscribed', `${subData.merchant} has been re-enabled.`);
      router.back();
    } catch (e: any) {
      Alert.alert('Resume failed', e?.message || 'Please try again.');
    }
  }

  async function onSnooze() {
    if (!accountId || !subData?.merchant) {
      return Alert.alert('Missing info', 'No account or merchant found.');
    }
    try {
      const r = await snoozeSubscription({
        accountId: String(accountId),
        merchant: subData.merchant!,
        amount: cleanAmount(subData.amount),
        days: 30,
      });
      Alert.alert('Snoozed', `Next charge pushed to ${r?.nextDate || 'later'}.`);
      router.back();
    } catch (e: any) {
      Alert.alert('Snooze failed', e?.message || 'Please try again.');
    }
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
  container:{ flex:1, padding:20, backgroundColor:'#fff' },
  center:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  back:{ color:'#0f62fe', marginBottom:8, fontWeight:'600' },
  title:{ fontSize:24, fontWeight:'800' },
  subtitle:{ color:'#374151', marginTop:4, marginBottom:16, fontWeight:'600' },
  card:{ backgroundColor:'#F8FAFC', borderRadius:12, padding:16, borderWidth:1, borderColor:'#E5E7EB' },
  row:{ flexDirection:'row', justifyContent:'space-between', marginBottom:10 },
  rowLabel:{ color:'#6B7280' },
  rowValue:{ color:'#111827', fontWeight:'600' },
  actions:{ flexDirection:'row', gap:10, marginTop:16, flexWrap:'wrap' },
  primaryBtn:{ backgroundColor:'#0F62FE', paddingVertical:12, paddingHorizontal:16, borderRadius:10 },
  primaryBtnText:{ color:'#fff', fontWeight:'700' },
  secondaryBtn:{ backgroundColor:'#111827', paddingVertical:10, paddingHorizontal:14, borderRadius:10 },
  secondaryBtnText:{ color:'#fff', fontWeight:'700' },
  tertiaryBtn:{ backgroundColor:'#E5E7EB', paddingVertical:10, paddingHorizontal:14, borderRadius:10 },
  tertiaryBtnText:{ color:'#111827', fontWeight:'700' },
  err:{ color:'#b00020', marginBottom:8 },
});
