import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, AppState } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import { initNotifications } from './src/services/notifications';
import { syncPendingInspections } from './src/services/sync/syncService';

// ── Screens ─────────────────────────────────────────────────────────────────
import LoginScreen            from './src/screens/auth/LoginScreen';
import HomeTab                from './src/screens/tabs/HomeTab';
import NewInspectionTab       from './src/screens/tabs/NewInspectionTab';
import HistoryTab             from './src/screens/tabs/HistoryTab';
import ProfileTab             from './src/screens/tabs/ProfileTab';
import InspectionFlowScreen   from './src/screens/inspection/InspectionFlowScreen';
import TireInspectionScreen   from './src/screens/inspection/TireInspectionScreen';
import InspectionReportScreen from './src/screens/inspection/InspectionReportScreen';
import InspectionViewScreen    from './src/screens/inspection/InspectionViewScreen';
import MassInspectionScreen   from './src/screens/inspection/MassInspectionScreen';
import RotationScreen         from './src/screens/inspection/RotationScreen';
import NewVehicleScreen       from './src/screens/vehicle/NewVehicleScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const HEADER = {
  headerStyle: { backgroundColor: '#161b22' },
  headerTintColor: '#e6f1ff',
  headerTitleStyle: { fontWeight: '700' as const },
};

const TAB_BAR = {
  tabBarStyle: { backgroundColor: '#161b22', borderTopColor: '#30363d' },
  tabBarActiveTintColor: '#58a6ff',
  tabBarInactiveTintColor: '#8892b0',
  ...HEADER,
};

function TabIcon({ label }: { label: string }) {
  const icons: Record<string, string> = {
    Inicio: '🏠', Inspeccionar: '🔍', Historial: '📋', Perfil: '👤',
  };
  return <Text style={{ fontSize: 20 }}>{icons[label] ?? '•'}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator id={undefined as any} screenOptions={({ route }) => ({
      ...TAB_BAR,
      tabBarIcon: () => <TabIcon label={route.name} />,
    })}>
      <Tab.Screen name="Inicio"       component={HomeTab} />
      <Tab.Screen name="Inspeccionar" component={NewInspectionTab} />
      <Tab.Screen name="Historial"    component={HistoryTab} />
      <Tab.Screen name="Perfil"       component={ProfileTab} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { inspector, isLoading, loadSession } = useAuthStore();

  useEffect(() => { loadSession(); initNotifications(); }, []);

  // Inspecciones hechas sin señal: se suben solas al abrir la app, al volver a
  // ella y cada 2 minutos (si no hay internet, falla en silencio y reintenta).
  useEffect(() => {
    if (!inspector) return;
    let corriendo = false;
    const intentar = async () => {
      if (corriendo) return;
      corriendo = true;
      try { await syncPendingInspections(); } catch {} finally { corriendo = false; }
    };
    intentar();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') intentar(); });
    const id = setInterval(intentar, 2 * 60 * 1000);
    return () => { sub.remove(); clearInterval(id); };
  }, [inspector]);

  if (isLoading) {
    return (
      <View style={s.splash}>
        <Text style={s.splashText}>TireInspect</Text>
        <Text style={s.splashSub}>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator id={undefined as any} screenOptions={HEADER}>
        {!inspector ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="InspectionFlow"   component={InspectionFlowScreen}   options={{ title: 'Inspección' }} />
            <Stack.Screen name="TireInspection"   component={TireInspectionScreen}   options={{ title: 'Llanta' }} />
            <Stack.Screen name="InspectionReport" component={InspectionReportScreen} options={{ title: 'Reporte' }} />
            <Stack.Screen name="InspectionView"   component={InspectionViewScreen}   options={{ title: 'Detalle de inspección' }} />
            <Stack.Screen name="MassInspection"   component={MassInspectionScreen}   options={{ title: 'Inspección masiva' }} />
            <Stack.Screen name="Rotation"         component={RotationScreen}         options={{ title: 'Rotación de llantas' }} />
            <Stack.Screen name="NewVehicle"       component={NewVehicleScreen}       options={{ title: 'Nuevo vehículo' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  splash: { flex:1, backgroundColor:'#0d1117', alignItems:'center', justifyContent:'center' },
  splashText: { fontSize:36, fontWeight:'800', color:'#e94560' },
  splashSub: { fontSize:14, color:'#8892b0', marginTop:8 },
});
