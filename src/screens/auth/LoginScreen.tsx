import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { apiLogin } from '../../services/api/auth';

export default function LoginScreen() {
  const [email, setEmail]       = useState('inspector@demo.com');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const { inspector, token } = await apiLogin(email.trim(), password);
      await login(inspector, token);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.card}>
        <Text style={s.logo}>TireInspect</Text>
        <Text style={s.subtitle}>Inspección inteligente de neumáticos</Text>

        <View style={s.field}>
          <Text style={s.label}>Correo electrónico</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="inspector@empresa.com"
            placeholderTextColor="#555"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Contraseña</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#555"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnOff]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Ingresar</Text>
          }
        </TouchableOpacity>

        <Text style={s.hint}>Demo: inspector@demo.com / demo1234</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:'#0d1117', justifyContent:'center', padding:24 },
  card:       { backgroundColor:'#161b22', borderRadius:16, padding:28 },
  logo:       { fontSize:32, fontWeight:'800', color:'#e94560', textAlign:'center', marginBottom:4 },
  subtitle:   { fontSize:13, color:'#8892b0', textAlign:'center', marginBottom:32 },
  field:      { marginBottom:16 },
  label:      { color:'#ccd6f6', fontSize:14, marginBottom:6, fontWeight:'500' },
  input:      { backgroundColor:'#0f3460', borderRadius:10, padding:14, color:'#e6f1ff', fontSize:15, borderWidth:1, borderColor:'#1e4d8c' },
  btn:        { backgroundColor:'#e94560', borderRadius:10, padding:16, alignItems:'center', marginTop:8 },
  btnOff:     { opacity:0.6 },
  btnText:    { color:'#fff', fontSize:16, fontWeight:'700' },
  hint:       { color:'#555', fontSize:11, textAlign:'center', marginTop:16 },
});
