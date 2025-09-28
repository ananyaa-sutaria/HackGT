import { useState } from 'react';
import { View, Text, ImageBackground, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { loginApi } from '../src/lib/api';
import { setToken } from '../src/lib/auth';
import { FontAwesome } from '@expo/vector-icons';


export default function LoginScreen() {
  const [email, setEmail] = useState('demo@subsense.app');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onLogin = async () => {
    setErr(null); setLoading(true);
    try {
      const { token } = await loginApi(email.trim(), pin.trim());
      await setToken(token);
      router.replace('/'); // go to app
    } catch (e: any) {
      setErr(e?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <View style={s.container}>
      <View style = {s.box}>
        <Text style={s.title}>SubSense</Text>
        <Text style={s.subtitle}>Sign in to continue</Text>

        <TextInput
          style={s.input} value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address" placeholder="Email"
        />
        <TextInput
          style={s.input} value={pin} onChangeText={setPin}
          secureTextEntry placeholder="PIN (try 4242)"
        />

        {err ? <Text style={s.err}>{err}</Text> : null}

        <Pressable style={s.btn} onPress={onLogin} disabled={loading}>
          {loading ? <ActivityIndicator /> : <Text style={s.btnText}>Continue</Text>}
        </Pressable>

        <Text style={s.hint}>Demo PIN is 4242 (configurable on the server)</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  background: {flex:1},
  container:{ flex:1, padding:24, justifyContent:'center', backgroundColor:'#B5DAAF' },
  box:{backgroundColor: "#FFF8ED", borderRadius: 16, padding: 24},
  title:{ color: "#E4A8B8", fontSize:35, fontWeight:'800', marginBottom: 15, textAlign: "center"},
  subtitle:{ color:'#6B7280', marginBottom:16, textAlign: "center"},
  input:{backgroundColor: "#B5DAAF" , color:'#FFF8ED', borderWidth:3, borderColor:'#E4A8B8', borderRadius:10, padding:12, marginBottom:20 },
  btn:{ backgroundColor:'#E4A8B8', padding:14, borderRadius:10, alignItems:'center' },
  btnText:{ color:'#FFF8ED', fontWeight:'700' },
  err:{ color:'#EF4444', marginBottom:8 },
  hint:{ color:'#6B7280', fontSize:12, marginTop:12 },
});
