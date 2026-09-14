import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Mostrar la notificación aunque la app esté en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

let ready = false;

/** Pide permiso y prepara el canal de Android. Idempotente. */
export async function initNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('inspecciones', {
        name: 'Inspecciones',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e94560',
      });
    }
    const { status } = await Notifications.getPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.status === 'granted';
    }
    ready = granted;
    return granted;
  } catch {
    return false;
  }
}

/**
 * Reprograma el recordatorio diario (9:00 a.m.) según las unidades pendientes.
 * Es LOCAL: no necesita servidor ni token de push. Se llama al abrir la app.
 */
export async function syncDailyReminder(pendientes: number): Promise<void> {
  try {
    if (!ready) { const ok = await initNotifications(); if (!ok) return; }
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (pendientes <= 0) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚛 Inspecciones pendientes',
        body: `${pendientes} unidad${pendientes === 1 ? '' : 'es'} rodó +8,000 km y necesita inspección.`,
        ...(Platform.OS === 'android' ? { channelId: 'inspecciones' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });
  } catch {
    // silencioso: las notificaciones son un extra, nunca deben romper la app
  }
}
