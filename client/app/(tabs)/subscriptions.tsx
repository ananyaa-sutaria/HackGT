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

/* ----------------- helpers ----------------- */
const BUDGET_KEY = 'budget_monthly';
const keyForAccount = (accountId?: string, type?: 'checking'|'savings') => `subs_${type ?? 'checking'}_${accountId ?? 'unknown'}`;

const cleanAmount = (a: any) =>
  typeof a === 'string' ? Number(a.replace(/[^0-9.\-]/g, '')) || 0 : Number(a) || 0;

const toKey = (merchant: any, amount: any) =>
  `${String(merchant || '').trim().toLowerCase()}|${Math.round((Number(amount) || 0) * 100)}`;

const toMonthly = (amount: number, cadence?: string) => {
  const c = (cadence || 'monthly').toLowerCase();
  return c === 'yearly' ? amount / 12 : amount;
};

const prettyCadence = (c?: string) => (c === 'yearly' ? 'yearly' : 'monthly');

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
export default function SubscriptionsScreen() {
  const { accountId, accountType: initialType } = useLocalSearchParams<{ accountId?: string, accountType?: string }>();

  const [accountType, setAccountType] = useState<'checking' | 'savings'>(initialType === 'savings' ? 'savings' : 'checking');
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

  /* --------- Load budget --------- */
  useEffect(() => {
    (async () => {
      const b = await AsyncStorage.getItem(BUDGET_KEY);
      setBudget(b ? Number(b) || 0 : null);
    })();
  }, []);

  /* --------- Load subscriptions --------- */
  const load = useCallback(async () => {
    if (!accountId) {
      setLoading(false);
      setError('No account selected. Go to Accounts and pick one.');
      return;
    }
    try {
      setError(null);
      const stored = await AsyncStorage.getItem(keyForAccount(accountId, accountType));
      const parsed = stored ? JSON.parse(stored) : [];

      // For checking, allow adding new subs; for savings, generate demo if empty
      let cleanSubs: Sub[] = (Array.isArray(parsed) ? parsed : []).map((s: any) => ({
        merchant: s?.merchant ?? 'Unknown',
        amount: cleanAmount(s?.amount),
        cadence: s?.cadence === 'yearly' ? 'yearly' : 'monthly',
        nextDate: s?.nextDate,
      }));

      if (accountType === 'savings' && cleanSubs.length === 0) {
        // Generate and persist demo savings subs
        cleanSubs = generateSavingsDemoSubs();
        await AsyncStorage.setItem(keyForAccount(accountId, 'savings'), JSON.stringify(cleanSubs));
      }

      setSubs(cleanSubs);
    } catch (e: any) {
      setError(e?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accountId, accountType]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  /* --------- Generate demo savings --------- */
  const generateSavingsDemoSubs = useCallback((): Sub[] => {
    const merchants = [
      'Netflix', 'Spotify', 'Hulu', 'Amazon Prime', 'Disney+', 'YouTube Premium',
      'Apple Music', 'HBO Max', 'Adobe Creative Cloud', 'Canva Pro', 'Dropbox', 'Notion'
    ];
    return Array.from({ length: 20 }, () => {
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      const amount = (Math.random() * 50 + 5).toFixed(2);
      const cadence: Cadence = Math.random() > 0.7 ? 'yearly' : 'monthly';
      const nextDate = isoPlusDays(Math.floor(Math.random() * 60));
      return { merchant, amount, cadence, nextDate };
    });
  }, []);

  /* --------- Totals --------- */
  const totals = useMemo(() => {
    const monthly = subs.reduce((sum, s) => sum + toMonthly(cleanAmount(s.amount), s.cadence), 0);
    return { monthly, annual: monthly * 12 };
  }, [subs]);
  const overBudget = budget != null && totals.monthly > budget;

  /* --------- Filtering/search/sort --------- */
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
  }, [subs, accountType, filter, search, sortOrder]);

  /* --------- Add new subscription (checking only) --------- */
  const handleAddSubscription = async () => {
    if (!accountId) return;
    if (!newMerchant.trim() || !newAmount.trim()) {
      return Alert.alert('Missing info', 'Please provide merchant name and amount.');
    }
    const newSub: Sub = {
      merchant: newMerchant.trim(),
      amount: parseFloat(newAmount),
      cadence: newCadence,
      nextDate: newNextDate || undefined,
    };
    const updated = [...subs, newSub];
    setSubs(updated);
    try { await AsyncStorage.setItem(keyForAccount(accountId, 'checking'), JSON.stringify(updated)); }
    catch { Alert.alert('Error', 'Failed to save subscription.'); }
    setModalVisible(false);
    setNewMerchant(''); setNewAmount(''); setNewNextDate(''); setNewCadence('monthly');
  };

  /* --------- Render --------- */
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errTitle}>Couldn’t load subscriptions</Text>
      <Text style={styles.errMsg}>{error}</Text>
      <Pressable style={styles.primaryBtn} onPress={load}>
        <Text style={styles.primaryBtnText}>Retry</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Account type toggle */}
      <View style={{flexDirection:'row', justifyContent:'center', marginBottom:12}}>
        {['checking','savings'].map((type) => (
          <Pressable
            key={type}
            style={[styles.filterBtn, accountType === type && styles.filterBtnActive]}
            onPress={()=>setAccountType(type as 'checking'|'savings')}
          >
            <Text style={[styles.filterText, accountType===type && styles.filterTextActive]}>
              {type.charAt(0).toUpperCase()+type.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Totals */}
      <View style={[styles.totalsBar, overBudget && styles.totalsBarOver]}>
        <Text style={[styles.totalsText, overBudget && styles.totalsTextOver]}>
          Total: {fmt(totals.monthly)} / mo ({fmt(totals.annual)} / yr)
          {budget!=null ? `  •  Budget: $${budget.toFixed(2)}` : ''}
        </Text>
      </View>

      {/* Filters/search/sort (checking only) */}
      {accountType === 'checking' && (
        <>
          <View style={styles.filterRow}>
            {['all','monthly','yearly'].map(f=>(
              <Pressable key={f} style={[styles.filterBtn, filter===f && styles.filterBtnActive]} onPress={()=>setFilter(f as typeof filter)}>
                <Text style={[styles.filterText, filter===f && styles.filterTextActive]}>
                  {f==='all' ? 'All' : f.charAt(0).toUpperCase()+f.slice(1)}
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

      <FlatList
        data={filteredSubs}
        keyExtractor={(item,i)=>`${accountType}-${item.merchant}-${i}`}
        renderItem={({item})=>(
          <View style={styles.card}>
            <Text style={styles.name}>{item.merchant}</Text>
            <Text style={styles.line}>{fmt(cleanAmount(item.amount))} / {prettyCadence(item.cadence)}</Text>
            {item.nextDate && <Text style={styles.line}>Next: {item.nextDate}</Text>}
            <View style={{marginTop:10}}>
              <Link
                href={{
                  pathname:'/subscriptionDetail',
                  params:{accountId: String(accountId ?? ''), sub: JSON.stringify(item)}
                }}
                asChild
              >
                <Pressable style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Details</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{alignItems:'center', marginTop:24}}>
            <Text>No subscriptions found.</Text>
            {accountType==='checking' && (
              <Pressable style={[styles.primaryBtn,{marginTop:12}]} onPress={async()=>{
                const demo = [
                  { merchant: 'Netflix', amount: 15.99, cadence: 'monthly', nextDate: isoPlusDays(12) },
                  { merchant: 'Spotify', amount: 9.99, cadence: 'monthly', nextDate: isoPlusDays(20) },
                  { merchant: 'Prime', amount: 139, cadence: 'yearly', nextDate: isoPlusDays(50) },
                ];
                await AsyncStorage.setItem(keyForAccount(accountId,'checking'), JSON.stringify(demo));
                load();
                Alert.alert('Demo created','Seeded sample subscriptions for this account.');
              }}>
                <Text style={styles.primaryBtnText}>Create demo subscriptions</Text>
              </Pressable>
            )}
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{paddingBottom:20}}
      />

      {/* Add modal (checking only) */}
      {accountType==='checking' && (
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.title}>New Subscription</Text>
              <TextInput placeholder="Merchant" style={styles.modalInput} value={newMerchant} onChangeText={setNewMerchant}/>
              <TextInput placeholder="Amount" style={styles.modalInput} value={newAmount} onChangeText={setNewAmount} keyboardType="numeric"/>
              <TextInput placeholder="Next Due Date (YYYY-MM-DD)" style={styles.modalInput} value={newNextDate} onChangeText={setNewNextDate}/>
              <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:12}}>
                {(['monthly','yearly'] as Cadence[]).map(c=>(
                  <Pressable key={c} style={[styles.filterBtn, newCadence===c && styles.filterBtnActive]} onPress={()=>setNewCadence(c)}>
                    <Text style={[styles.filterText, newCadence===c && styles.filterTextActive]}>
                      {c.charAt(0).toUpperCase()+c.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:16}}>
                <Pressable style={[styles.primaryBtn,{flex:1,marginRight:4}]} onPress={handleAddSubscription}>
                  <Text style={styles.primaryBtnText}>Save</Text>
                </Pressable>
                <Pressable style={[styles.secondaryBtn,{flex:1,marginLeft:4}]} onPress={()=>setModalVisible(false)}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

/* ----------------- styles ----------------- */
const styles = StyleSheet.create({
  container:{ flex:1, padding:20, backgroundColor:'#B5DAAF' },
  center:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  title:{ fontSize:22, fontWeight:'700', marginBottom:12 },

  totalsBar:{ backgroundColor:'#FFF8ED', padding:10, borderRadius:10, marginBottom:12 },
  totalsText:{ fontWeight:'700', color:'#222', textAlign:'center' },
  totalsBarOver:{ backgroundColor:'#fee2e2', borderColor:'#fecaca', borderWidth:1 },
  totalsTextOver:{ color:'#991b1b' },

  filterRow:{ flexDirection:'row', marginBottom:12, justifyContent:'center' },
  filterBtn:{ paddingVertical:6, paddingHorizontal:12, borderRadius:8, backgroundColor:'#ddd', marginHorizontal:4 },
  filterBtnActive:{ backgroundColor:'#E4A8B8' },
  filterText:{ color:'#333', fontWeight:'600' },
  filterTextActive:{ color:'#fff' },

  searchInput:{ backgroundColor:'#FFF8ED', padding:10, borderRadius:8, marginBottom:12, borderColor:'#ccc', borderWidth:1 },

  sortRow:{ flexDirection:'row', justifyContent:'center', marginBottom:12 },
  sortBtn:{ paddingVertical:6, paddingHorizontal:12, borderRadius:8, backgroundColor:'#ddd', marginHorizontal:4 },
  sortBtnActive:{ backgroundColor:'#E4A8B8' },
  sortText:{ color:'#333', fontWeight:'600' },
  sortTextActive:{ color:'#fff' },

  card:{ padding:16, backgroundColor:'#FFF8ED', marginBottom:12, borderRadius:12 },
  name:{ fontSize:18, fontWeight:'700', marginBottom:6 },
  line:{ color:'#333' },

  secondaryBtn:{ backgroundColor:'#E4A8B8', paddingVertical:10, paddingHorizontal:14, borderRadius:10, alignItems:'center', alignSelf:'flex-start' },
  secondaryBtnText:{ color:'#fff', fontWeight:'700' },

  primaryBtn:{ backgroundColor:'#E4A8B8', paddingVertical:12, paddingHorizontal:16, borderRadius:10, alignItems:'center' },
  primaryBtnText:{ color:'#fff', fontWeight:'700', textAlign:'center' },

  errTitle:{ fontSize:18, fontWeight:'700', marginBottom:8 },
  errMsg:{ color:'#b00020', textAlign:'center', marginBottom:12 },

  modalOverlay:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' },
  modalContainer:{ width:'90%', backgroundColor:'#fff', borderRadius:12, padding:16 },
  modalInput:{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginTop:8 },
//please work!
});
