// app/(tabs)/subscriptions.tsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator,
  RefreshControl, Alert, TextInput, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { on } from '../../src/lib/bus';

/* ----------------- types ----------------- */
type Cadence = 'monthly' | 'yearly';
type Sub = { merchant: string; amount: number | string; cadence?: Cadence; nextDate?: string };

/* ----------------- helpers (top-level so they’re stable) ----------------- */
const BUDGET_KEY = 'budget_monthly';
const keyForAccount = (accountId?: string) => `subs_account_${accountId ?? 'unknown'}`;

const cleanAmount = (a: any) =>
  typeof a === 'string' ? Number(a.replace(/[^0-9.\-]/g, '')) || 0 : Number(a) || 0;

const toKey = (merchant: any, amount: any) =>
  `${String(merchant || '').trim().toLowerCase()}|${Math.round((Number(amount) || 0) * 100)}`;

const toMonthly = (amount: number, cadence?: string) => {
  const c = (cadence || 'monthly').toLowerCase();
  return c === 'yearly' ? amount / 12 : amount;
};

const prettyCadence = (c?: string) => (c === 'yearly' ? 'yearly' : 'monthly');

<<<<<<< HEAD
const CHECKING_DEMO: Sub[] = [
  { merchant: 'Electric Bill', amount: 100, cadence: 'monthly' },
  { merchant: 'Water Bill', amount: 30, cadence: 'monthly' },
  { merchant: 'Internet', amount: 60, cadence: 'monthly' },
  { merchant: 'Gym', amount: 40, cadence: 'monthly' },
  { merchant: 'Netflix', amount: 15, cadence: 'monthly' },
];

const SAVINGS_DEMO: Sub[] = [
  { merchant: 'Gym Membership', amount: 50, cadence: 'monthly' },
  { merchant: 'Spotify', amount: 10, cadence: 'monthly' },
  { merchant: 'Netflix', amount: 15, cadence: 'monthly' },
  { merchant: 'Apple One', amount: 30, cadence: 'monthly' },
  { merchant: 'Online Course', amount: 120, cadence: 'yearly' },
  { merchant: 'Amazon Prime', amount: 139, cadence: 'yearly' },
  { merchant: 'Magazine Subscription', amount: 20, cadence: 'monthly' },
  { merchant: 'Meal Kit', amount: 80, cadence: 'monthly' },
  { merchant: 'Cloud Storage', amount: 100, cadence: 'yearly' },
];

=======
const fmt = (v: number) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
};

const isoPlusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/* ----------------- component ----------------- */
>>>>>>> 7a45322 (cancel)
export default function SubscriptionsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();

  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);

  const [filter, setFilter] = useState<'all' | 'monthly' | 'yearly'>('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  const [modalVisible, setModalVisible] = useState(false);
  const [newMerchant, setNewMerchant] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCadence, setNewCadence] = useState<Cadence>('monthly');
  const [newNextDate, setNewNextDate] = useState('');

  const [selectedSavingsSubs, setSelectedSavingsSubs] = useState<Sub[]>([]);

  // Load budget once
  useEffect(() => {
    (async () => {
      const b = await AsyncStorage.getItem(BUDGET_KEY);
      setBudget(b ? Number(b) || 0 : null);
    })();
  }, []);

  // Load subscriptions
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
<<<<<<< HEAD
      if (accountType === 'checking') {
        const data = await scanSubscriptions(String(accountId ?? ''));
        const clean = (Array.isArray(data) ? data : []).map((s: any) => ({
          merchant: s?.merchant ?? 'Unknown',
          amount: cleanAmount(s?.amount),
          cadence: s?.cadence === 'yearly' ? 'yearly' : 'monthly',
          nextDate: s?.nextDate,
        })) as Sub[];
        setSubs(clean.length > 0 ? clean : CHECKING_DEMO);
      } else {
        setSubs(SAVINGS_DEMO);
      }
=======
      const stored = await AsyncStorage.getItem(keyForAccount(accountId));
      const parsed = stored ? JSON.parse(stored) : [];
      const clean: Sub[] = (Array.isArray(parsed) ? parsed : []).map((s: any) => ({
        merchant: s?.merchant ?? 'Unknown',
        amount: cleanAmount(s?.amount),
        cadence: (s?.cadence === 'yearly' ? 'yearly' : 'monthly') as Cadence,
        nextDate: s?.nextDate,
      }));
      setSubs(clean);
>>>>>>> 7a45322 (cancel)
    } catch (e: any) {
      setError(e?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
<<<<<<< HEAD
  }, [accountType, accountId]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

=======
  }, [accountId]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  // Optimistic event listeners (cancel/resume/snooze)
  useEffect(() => {
    if (!accountId) return;
    const acct = String(accountId);

    const save = async (next: Sub[]) =>
      AsyncStorage.setItem(keyForAccount(acct), JSON.stringify(next)).catch(() => {});

    const offCancel = on('sub:cancelled', (p: any) => {
      if (p?.accountId !== acct) return;
      const k = toKey(p.merchant, p.amount);
      setSubs(prev => {
        const next = prev.filter(s => toKey(s.merchant, cleanAmount(s.amount)) !== k);
        save(next);
        return next;
      });
    });

    const offResume = on('sub:resumed', (p: any) => {
      if (p?.accountId !== acct) return;
      // simplest: refetch (you could optimistically add if you pass cadence/nextDate in event)
      load();
    });

    const offSnooze = on('sub:snoozed', (p: any) => {
      if (p?.accountId !== acct) return;
      const k = toKey(p.merchant, p.amount);
      setSubs(prev => {
        const next = prev.map(s =>
          toKey(s.merchant, cleanAmount(s.amount)) === k ? { ...s, nextDate: p?.nextDate } : s
        );
        save(next);
        return next;
      });
    });

    return () => { offCancel(); offResume(); offSnooze(); };
  }, [accountId, load]);

>>>>>>> 7a45322 (cancel)
  // Totals
  const totals = useMemo(() => {
    const list = accountType === 'savings' ? selectedSavingsSubs : subs;
    const monthly = list.reduce((sum, s) => sum + toMonthly(cleanAmount(s.amount), s.cadence), 0);
    return { monthly, annual: monthly * 12 };
<<<<<<< HEAD
  }, [subs, selectedSavingsSubs, accountType]);

  const overBudget = budget != null && totals.monthly > budget;

  // Filtering + sorting (checking only)
=======
  }, [subs]);
  const overBudget = budget != null && totals.monthly > budget;

  // Filtering/search/sort
>>>>>>> 7a45322 (cancel)
  const filteredSubs = useMemo(() => {
    if (accountType === 'savings') return subs;
    let list = subs.filter((s) => {
      if (filter !== 'all' && s.cadence !== filter) return false;
      if (search.trim() && !s.merchant.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortOrder !== 'none') {
      list = [...list].sort((a, b) => {
        const aAmt = cleanAmount(a.amount), bAmt = cleanAmount(b.amount);
        return sortOrder === 'asc' ? aAmt - bAmt : bAmt - aAmt;
      });
    }
    return list;
  }, [subs, filter, search, sortOrder, accountType]);

  // Local demo seeding (no server dependency)
  const handleSeed = useCallback(async () => {
<<<<<<< HEAD
    try {
      if (accountType === 'checking') await provisionDemo({ type: 'checking' });
      else await provisionDemo({ type: 'savings' });
      await load();
      Alert.alert('Demo created', `Seeded ${accountType} subscriptions.`);
    } catch (e: any) {
      Alert.alert('Seed failed', e?.message || 'Please try again.');
    }
  }, [load, accountType]);

  const handleAddSubscription = () => {
=======
    if (!accountId) return;
    const sample: Sub[] = [
      { merchant: 'Netflix',  amount: 15.99, cadence: 'monthly', nextDate: isoPlusDays(12) },
      { merchant: 'Spotify',  amount: 9.99,  cadence: 'monthly', nextDate: isoPlusDays(20) },
      { merchant: 'Prime',    amount: 139,   cadence: 'yearly',  nextDate: isoPlusDays(50) },
    ];
    await AsyncStorage.setItem(keyForAccount(accountId), JSON.stringify(sample));
    await load();
    Alert.alert('Demo created', 'Seeded sample subscriptions for this account.');
  }, [accountId, load]);

  const handleAddSubscription = async () => {
    if (!accountId) return;
>>>>>>> 7a45322 (cancel)
    if (!newMerchant.trim() || !newAmount.trim()) {
      return Alert.alert('Missing info', 'Please provide merchant name and amount.');
    }
    const newSub: Sub = {
      merchant: newMerchant.trim(),
      amount: parseFloat(newAmount),
      cadence: newCadence,
      nextDate: newNextDate || undefined,
    };
<<<<<<< HEAD
    setSubs((prev) => [...prev, newSub]);
=======
    const updated = [...subs, newSub];
    setSubs(updated);
    try { await AsyncStorage.setItem(keyForAccount(accountId), JSON.stringify(updated)); }
    catch { Alert.alert('Error', 'Failed to save subscription.'); }
>>>>>>> 7a45322 (cancel)
    setModalVisible(false);
    setNewMerchant(''); setNewAmount(''); setNewNextDate(''); setNewCadence('monthly');
  };

<<<<<<< HEAD
  const handleSelectSavings = (sub: Sub) => {
    if (!selectedSavingsSubs.find((s) => s.merchant === sub.merchant)) {
      setSelectedSavingsSubs((prev) => [...prev, sub]);
    }
  };
  const handleRemoveSavings = (index: number) => {
    setSelectedSavingsSubs((prev) => prev.filter((_, i) => i !== index));
  };

=======
>>>>>>> 7a45322 (cancel)
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
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
<<<<<<< HEAD
      {/* Toggle */}
      <View style={{ flexDirection:'row', justifyContent:'center', marginBottom:12 }}>
        {['checking','savings'].map(t => (
=======
      {/* Totals */}
      <View style={[styles.totalsBar, overBudget && styles.totalsBarOver]}>
        <Text style={[styles.totalsText, overBudget && styles.totalsTextOver]}>
          Total: {fmt(totals.monthly)} / mo  ({fmt(totals.annual)} / yr)
          {budget != null ? `  •  Budget: $${(budget ?? 0).toFixed(2)}` : ''}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {['all', 'monthly', 'yearly'].map((f) => (
>>>>>>> 7a45322 (cancel)
          <Pressable
            key={t}
            style={[styles.filterBtn, accountType===t && styles.filterBtnActive]}
            onPress={()=>setAccountType(t as 'checking'|'savings')}
          >
            <Text style={[styles.filterText, accountType===t && styles.filterTextActive]}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

<<<<<<< HEAD
      {/* Totals */}
      <View style={[styles.totalsBar, overBudget && styles.totalsBarOver]}>
        <Text style={[styles.totalsText, overBudget && styles.totalsTextOver]}>
          Total: {fmt(totals.monthly)} / mo ({fmt(totals.annual)} / yr)
          {budget != null ? `  •  Budget: $${budget.toFixed(2)}` : ''}
        </Text>
      </View>

      {/* Checking controls */}
      {accountType === 'checking' && (
        <>
          <View style={styles.filterRow}>
            {['all','monthly','yearly'].map(f=>(
              <Pressable
                key={f}
                style={[styles.filterBtn, filter===f && styles.filterBtnActive]}
                onPress={()=>setFilter(f as typeof filter)}
=======
      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search subscriptions..."
        value={search}
        onChangeText={setSearch}
      />

      {/* Sort */}
      <View style={styles.sortRow}>
        <Pressable
          style={[styles.sortBtn, sortOrder === 'asc' && styles.sortBtnActive]}
          onPress={() => setSortOrder(sortOrder === 'asc' ? 'none' : 'asc')}
        >
          <Text style={[styles.sortText, sortOrder === 'asc' && styles.sortTextActive]}>
            Low → High
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sortBtn, sortOrder === 'desc' && styles.sortBtnActive]}
          onPress={() => setSortOrder(sortOrder === 'desc' ? 'none' : 'desc')}
        >
          <Text style={[styles.sortText, sortOrder === 'desc' && styles.sortTextActive]}>
            High → Low
          </Text>
        </Pressable>
      </View>

      {/* Add New */}
      <Pressable style={[styles.primaryBtn, { marginBottom: 12 }]} onPress={() => setModalVisible(true)}>
        <Text style={styles.primaryBtnText}>Add New Subscription</Text>
      </Pressable>

      <Text style={styles.title}>Detected Subscriptions</Text>

      <FlatList
        data={filteredSubs}
        keyExtractor={(item, i) => `${item?.merchant ?? 'm'}-${i}`}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.merchant}</Text>
            <Text style={styles.line}>
              {fmt(cleanAmount(item.amount))} / {prettyCadence(item.cadence)}
            </Text>
            {item.nextDate ? <Text style={styles.line}>Next: {item.nextDate}</Text> : null}

            <View style={{ marginTop: 10 }}>
              <Link
                href={{
                  pathname: '/subscriptionDetail',
                  params: { accountId: String(accountId ?? ''), sub: JSON.stringify(item) },
                }}
                asChild
>>>>>>> 7a45322 (cancel)
              >
                <Text style={[styles.filterText, filter===f && styles.filterTextActive]}>
                  {f==='all'?'All':f.charAt(0).toUpperCase()+f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search subscriptions..."
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.sortRow}>
            <Pressable
              style={[styles.sortBtn, sortOrder==='asc' && styles.sortBtnActive]}
              onPress={()=>setSortOrder(sortOrder==='asc'?'none':'asc')}
            >
              <Text style={[styles.sortText, sortOrder==='asc' && styles.sortTextActive]}>Low → High</Text>
            </Pressable>
            <Pressable
              style={[styles.sortBtn, sortOrder==='desc' && styles.sortBtnActive]}
              onPress={()=>setSortOrder(sortOrder==='desc'?'none':'desc')}
            >
              <Text style={[styles.sortText, sortOrder==='desc' && styles.sortTextActive]}>High → Low</Text>
            </Pressable>
          </View>
          <Pressable style={[styles.primaryBtn,{marginBottom:12}]} onPress={()=>setModalVisible(true)}>
            <Text style={styles.primaryBtnText}>Add New Subscription</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.title}>
        {accountType==='checking'?'Detected Subscriptions':'Demo Savings Subscriptions'}
      </Text>

      {/* Main List */}
      <FlatList
        data={filteredSubs}
        keyExtractor={(item,i)=>`${accountType}-${item?.merchant ?? 'm'}-${i}`}
        renderItem={({item,index})=>{
          if(accountType==='checking'){
            return (
              <View style={styles.card}>
                <Text style={styles.name}>{item.merchant}</Text>
                <Text style={styles.line}>{fmt(cleanAmount(item.amount))} / {prettyCadence(item.cadence)}</Text>
                {item.nextDate && <Text style={styles.line}>Next: {item.nextDate}</Text>}
                <View style={{marginTop:10}}>
                  <Link href={{pathname:'/subscriptionDetail', params:{accountId:String(accountId ?? ''), sub:JSON.stringify(item)}}} asChild>
                    <Pressable style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>Details</Text></Pressable>
                  </Link>
                </View>
              </View>
            );
          } else {
            const selected = selectedSavingsSubs.includes(item);
            return (
              <Pressable style={[styles.card, selected && {backgroundColor:'#d0f0c0'}]} onPress={()=>handleSelectSavings(item)}>
                <Text style={styles.name}>{item.merchant}</Text>
                <Text style={styles.line}>{fmt(cleanAmount(item.amount))} / {prettyCadence(item.cadence)}</Text>
              </Pressable>
            );
          }
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{paddingBottom:20}}
      />

<<<<<<< HEAD
      {/* Savings selection */}
      {accountType==='savings' && selectedSavingsSubs.length>0 && (
        <>
          <Text style={[styles.title,{marginTop:20}]}>Your Selection</Text>
          <FlatList
            data={selectedSavingsSubs}
            keyExtractor={(item,i)=>`selected-${i}`}
            renderItem={({item,index})=>(
              <View style={styles.card}>
                <Text style={styles.name}>{item.merchant}</Text>
                <Text style={styles.line}>{fmt(cleanAmount(item.amount))} / {prettyCadence(item.cadence)}</Text>
                <Pressable style={[styles.secondaryBtn,{marginTop:8}]} onPress={()=>handleRemoveSavings(index)}>
                  <Text style={styles.secondaryBtnText}>Remove</Text>
                </Pressable>
              </View>
            )}
          />
        </>
      )}

      {/* Modal (checking only) */}
      {accountType==='checking' && (
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.title}>New Subscription</Text>
              <TextInput placeholder="Merchant" style={styles.modalInput} value={newMerchant} onChangeText={setNewMerchant}/>
              <TextInput placeholder="Amount" style={styles.modalInput} value={newAmount} onChangeText={setNewAmount} keyboardType="numeric"/>
              <TextInput placeholder="Next Due Date (YYYY-MM-DD)" style={styles.modalInput} value={newNextDate} onChangeText={setNewNextDate}/>
              <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:12}}>
                {['monthly','yearly'].map(c=>(
                  <Pressable key={c} style={[styles.filterBtn,newCadence===c && styles.filterBtnActive]} onPress={()=>setNewCadence(c as 'monthly'|'yearly')}>
                    <Text style={[styles.filterText,newCadence===c && styles.filterTextActive]}>{c.charAt(0).toUpperCase()+c.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:16}}>
                <Pressable style={[styles.primaryBtn,{flex:1,marginRight:4}]} onPress={handleAddSubscription}><Text style={styles.primaryBtnText}>Save</Text></Pressable>
                <Pressable style={[styles.secondaryBtn,{flex:1,marginLeft:4}]} onPress={()=>setModalVisible(false)}><Text style={styles.secondaryBtnText}>Cancel</Text></Pressable>
              </View>
=======
      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.title}>New Subscription</Text>
            <TextInput placeholder="Merchant" style={styles.modalInput} value={newMerchant} onChangeText={setNewMerchant}/>
            <TextInput placeholder="Amount" style={styles.modalInput} value={newAmount} onChangeText={setNewAmount} keyboardType="numeric"/>
            <TextInput placeholder="Next Due Date (YYYY-MM-DD)" style={styles.modalInput} value={newNextDate} onChangeText={setNewNextDate}/>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              {(['monthly','yearly'] as Cadence[]).map((c) => (
                <Pressable key={c} style={[styles.filterBtn, newCadence === c && styles.filterBtnActive]} onPress={() => setNewCadence(c)}>
                  <Text style={[styles.filterText, newCadence === c && styles.filterTextActive]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <Pressable style={[styles.primaryBtn, { flex: 1, marginRight: 4 }]} onPress={handleAddSubscription}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </Pressable>
              <Pressable style={[styles.secondaryBtn, { flex: 1, marginLeft: 4 }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
>>>>>>> 7a45322 (cancel)
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

<<<<<<< HEAD
/* ---------- helpers ---------- */
function cleanAmount(a: any) { return typeof a==='string'?Number(a.replace(/[^0-9.\-]/g,''))||0:Number(a)||0; }
function toMonthly(amount:number,cadence?:string){const c=(cadence||'monthly').toLowerCase(); return c==='yearly'?amount/12:amount;}
function prettyCadence(c?:string){const map:Record<string,string>={monthly:'monthly',yearly:'yearly'}; return c&&map[c]?map[c]:'monthly'; }
function fmt(v:number){try{return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(v);}catch{return `$${v.toFixed(2)}`;}}

/* ---------- styles ---------- */
=======
/* ----------------- styles ----------------- */
>>>>>>> 7a45322 (cancel)
const styles = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#B5DAAF' },
  center:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  title:{ fontSize:22, fontWeight:'700', marginBottom:12 },

  totalsBar:{ backgroundColor:'#f6f6f6', padding:10, borderRadius:10, marginBottom:12 },
  totalsText:{ fontWeight:'700', color:'#222', textAlign:'center' },
  totalsBarOver:{ backgroundColor:'#fee2e2', borderColor:'#fecaca', borderWidth:1 },
  totalsTextOver:{ color:'#991b1b' },

  filterRow:{ flexDirection:'row', marginBottom:12, justifyContent:'center' },
  filterBtn:{ paddingVertical:6, paddingHorizontal:12, borderRadius:8, backgroundColor:'#ddd', marginHorizontal:4 },
  filterBtnActive:{ backgroundColor:'#0f62fe' },
  filterText:{ color:'#333', fontWeight:'600' },
  filterTextActive:{ color:'#fff' },

  searchInput:{ backgroundColor:'#fff', padding:10, borderRadius:8, marginBottom:12, borderColor:'#ccc', borderWidth:1 },

  sortRow:{ flexDirection:'row', justifyContent:'center', marginBottom:12 },
  sortBtn:{ paddingVertical:6, paddingHorizontal:12, borderRadius:8, backgroundColor:'#ddd', marginHorizontal:4 },
  sortBtnActive:{ backgroundColor:'#0f62fe' },
  sortText:{ color:'#333', fontWeight:'600' },
  sortTextActive:{ color:'#fff' },

  card:{ padding:16, backgroundColor:'#e9f0ff', marginBottom:12, borderRadius:12 },
  name:{ fontSize:18, fontWeight:'700', marginBottom:6 },
  line:{ color:'#333' },

  secondaryBtn:{ backgroundColor:'#0f62fe', paddingVertical:10, paddingHorizontal:14, borderRadius:10, alignItems:'center', alignSelf:'flex-start' },
  secondaryBtnText:{ color:'#fff', fontWeight:'700' },

  primaryBtn:{ backgroundColor:'#0f62fe', paddingVertical:12, paddingHorizontal:16, borderRadius:10, alignItems:'center' },
  primaryBtnText:{ color:'#fff', fontWeight:'700', textAlign:'center' },

  errTitle:{ fontSize:18, fontWeight:'700', marginBottom:8 },
  errMsg:{ color:'#b00020', textAlign:'center', marginBottom:12 },

  modalOverlay:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' },
  modalContainer:{ width:'90%', backgroundColor:'#fff', borderRadius:12, padding:16 },
  modalInput:{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginTop:8 },
});
