import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { syncPendingInspections } from '../../services/sync/syncService';

export default function ProfileTab() {
  const { inspector, logout } = useAuthStore();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const count = await syncPendingInspections();
      Alert.alert('Sincronización', count > 0 ? `${count} inspecciones sincronizadas.` : 'Todo está al día.');
    } catch { Alert.alert('Error', 'No se pudo sincronizar. Verifica la conexión.'); }
    finally { setSyncing(false); }
  };

  return (
    <View style={s.container}>
      <View style={s.avatarBox}>
        <View style={s.avatar}><Text style={s.avatarText}>{inspector?.name?.charAt(0).toUpperCase() ?? '?'}</Text></View>
        <Text style={s.name}>{inspector?.name}</Text>
        <Text style={s.email}>{inspector?.email}</Text>
        <View style={s.roleBadge}><Text style={s.roleText}>{inspector?.role ?? 'inspector'}</Text></View>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Empresa</Text>
        <View style={s.row}><Text style={s.rowLabel}>Compañía</Text><Text style={s.rowVal}>{inspector?.company ?? '—'}</Text></View>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Sincronización</Text>
        <TouchableOpacity style={[s.syncBtn, syncing && s.btnOff]} onPress={handleSync} disabled={syncing}>
          <Text style={s.syncBtnText}>{syncing ? 'Sincronizando...' : '☁  Sincronizar inspecciones'}</Text>
        </TouchableOpacity>
        <Text style={s.syncHint}>Las inspecciones offline se enviarán al servidor.</Text>
      </View>
      <TouchableOpacity style={s.logoutBtn} onPress={() => Alert.alert('Cerrar sesión', '¿Seguro?', [{ text:'Cancelar', style:'cancel' }, { text:'Salir', style:'destructive', onPress:logout }])}>
        <Text style={s.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0d1117', padding:20 },
  avatarBox:{ alignItems:'center', paddingVertical:24 },
  avatar:{ width:80, height:80, borderRadius:40, backgroundColor:'#1f6feb', alignItems:'center', justifyContent:'center', marginBottom:12 },
  avatarText:{ fontSize:32, fontWeight:'800', color:'#fff' },
  name:{ fontSize:22, fontWeight:'700', color:'#e6f1ff' },
  email:{ fontSize:13, color:'#8892b0', marginTop:4 },
  roleBadge:{ marginTop:8, backgroundColor:'#21262d', borderRadius:20, paddingHorizontal:12, paddingVertical:4 },
  roleText:{ fontSize:12, color:'#58a6ff', fontWeight:'600', textTransform:'capitalize' },
  card:{ backgroundColor:'#161b22', borderRadius:12, padding:16, marginBottom:16, borderWidth:1, borderColor:'#30363d' },
  cardTitle:{ fontSize:11, color:'#8892b0', fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginBottom:12 },
  row:{ flexDirection:'row', justifyContent:'space-between' },
  rowLabel:{ color:'#8892b0', fontSize:14 },
  rowVal:{ color:'#e6f1ff', fontSize:14, fontWeight:'600' },
  syncBtn:{ backgroundColor:'#1f6feb', borderRadius:10, padding:14, alignItems:'center' },
  btnOff:{ opacity:0.5 },
  syncBtnText:{ color:'#fff', fontWeight:'700', fontSize:15 },
  syncHint:{ color:'#8892b0', fontSize:12, marginTop:8, textAlign:'center' },
  logoutBtn:{ borderWidth:1, borderColor:'#e94560', borderRadius:10, padding:14, alignItems:'center', marginTop:8 },
  logoutText:{ color:'#e94560', fontWeight:'700', fontSize:15 },
});
