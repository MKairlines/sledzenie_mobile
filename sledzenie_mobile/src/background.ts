import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK = 'background-location-task';
const QUEUE_KEY = 'pending-locations';

async function enqueue(locations: Location.LocationObject[]) {
  const prev = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || '[]');
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(prev.concat(locations)));
}

async function flushQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  const batch = JSON.parse(raw);
  if (!batch.length) return;

  try {
    await fetch('https://your-vercel-app.vercel.app/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: batch }),
    });
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // stay queued if offline
  }
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  await enqueue(locations);
  await flushQueue();
});

export async function startBackgroundUpdates() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return;

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return;

  const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (isStarted) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 50,
    deferredUpdatesInterval: 60000,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Tracking location',
      notificationBody: 'Your location is being recorded.',
    },
  });
}
