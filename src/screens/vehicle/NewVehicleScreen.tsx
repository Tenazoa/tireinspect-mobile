import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createVehicle } from '../../services/api/vehicles';
import { upsertVehicle } from '../../services/storage/database';
import { VEHICLE_TYPE_POSITIONS, tirePositionLabel, isSpare } from '../../utils/constants';
import type { VehicleType } from '../../types';
import { generateUUID as uuidv4 } from '../../utils/uuid';

const TYPES = [
  { value:'car', label:'Auto', axles:2 },
  { value:'van', label:'Furgón', axles:2 },
  { value:'truck', label:'Camión 6x4', axles:3 },
  { value:'trailer', label:'Carreta 6x0', axles:3 },
  { value:'bus', label:'Bus', axles:3 },
  { value:'motorcycle', label:'Moto', axles:1 },
];

export default function NewVehicleScreen() {
  const navigation = useNavigation<any>();
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [type, setType] = useState<VehicleType>('truck');
  const [saving, setSaving] = useState(false);

  const positions = VEHICLE_TYPE_POSITIONS[type] ?? ['FL','FR','RL','RR'];
  const axleCount = TYPES.find(t => t.value === type)?.axles ?? 2;

  const handleSave = async () => {
    if (!plate || !brand || !model) { Alert.alert('Campos requeridos', 'Placa, marca y modelo son obligatorios.'); return; }
    setSaving(true);
    try {
      const vehicle = await createVehicle({ plate: plate.toUpperCase(), brand, model, year: Number(year), type, axleCount, tirePositions: positions });
      await upsertVehicle(vehicle);
      Alert.alert('Guardado', `${plate.toUpperCase()} registrado correctamente.`, [{ text:'OK', onPress:() => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo registrar.');
    } finally { setSaving(false); }
  };

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.heading}>Nuevo vehículo</Text>
      {[
        { label:'Placa *', val:plate, set:(v:string)=>setPlate(v.toUpperCase()), ph:'ABC-123', caps:'characters' as const },
        { label:'Marca *', val:brand, set:setBrand, ph:'Volvo, Scania...', caps:'words' as const },
        { label:'Modelo *', val:model, set:setModel, ph:'FH 460, R450...', caps:'words' as const },
        { label:'Año', val:year, set:setYear, ph:'2021', num:true },
      ].map(f => (
        <View key={f.label} style={s.field}>
          <Text style={s.label}>{f.label}</Text>
          <TextInput style={s.input} value={f.val} onChangeText={f.set} placeholder={f.ph} placeholderTextColor="#555" autoCapitalize={f.caps ?? 'none'} keyboardType={f.num ? 'numeric' : 'default'} />
        </View>
      ))}
      <View style={s.field}>
        <Text style={s.label}>Tipo de vehículo</Text>
        <View style={s.typeGrid}>
          {TYPES.map(t => (
            <TouchableOpacity key={t.value} style={[s.typeChip, type === t.value && s.typeChipActive]} onPress={() => setType(t.value as VehicleType)}>
              <Text style={[s.typeText, type === t.value && s.typeTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={s.preview}>
        <Text style={s.previewTitle}>
          {positions.map(p => tirePositionLabel(p)).join(' · ')}
        </Text>
        <Text style={s.previewMeta}>
          {positions.filter(p => !isSpare(p)).length} rodando
          {positions.filter(p => isSpare(p)).length > 0 ? ` + ${positions.filter(p => isSpare(p)).length} repuesto` : ''}
          {' · '}{axleCount} ejes
        </Text>
      </View>
      <TouchableOpacity style={[s.saveBtn, saving && s.btnOff]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Registrar vehículo</Text>}
      </TouchableOpacity>
      <View style={{ height:40 }} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0d1117', padding:20 },
  heading:{ fontSize:22, fontWeight:'700', color:'#e6f1ff', marginBottom:20 },
  field:{ marginBottom:16 },
  label:{ fontSize:13, color:'#8892b0', marginBottom:6 },
  input:{ backgroundColor:'#161b22', borderRadius:10, padding:14, color:'#e6f1ff', fontSize:15, borderWidth:1, borderColor:'#30363d' },
  typeGrid:{ flexDirection:'row', flexWrap:'wrap', gap:8 },
  typeChip:{ paddingHorizontal:16, paddingVertical:10, borderRadius:10, backgroundColor:'#161b22', borderWidth:1, borderColor:'#30363d' },
  typeChipActive:{ backgroundColor:'#1f6feb', borderColor:'#58a6ff' },
  typeText:{ color:'#8892b0', fontSize:14 },
  typeTextActive:{ color:'#fff', fontWeight:'700' },
  preview:{ backgroundColor:'#161b22', borderRadius:12, padding:16, marginBottom:20, borderWidth:1, borderColor:'#30363d' },
  previewTitle:{ color:'#58a6ff', fontSize:13, fontWeight:'600' },
  previewMeta:{ color:'#8892b0', fontSize:12, marginTop:4 },
  saveBtn:{ backgroundColor:'#238636', borderRadius:10, padding:16, alignItems:'center' },
  btnOff:{ opacity:0.5 },
  saveBtnText:{ color:'#fff', fontWeight:'700', fontSize:16 },
});
