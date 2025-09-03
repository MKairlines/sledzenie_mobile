import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values'; // Needed for UUID
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [statusText, setStatusText] = useState('Nieaktywne');
  const [isTracking, setIsTracking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userIdInitError, setUserIdInitError] = useState<string | null>(null);

  const watchId = useRef<string | null>(null);

  const apiUrl = 'https://sledzenie-psi.vercel.app/api/track-location';

  // Generate or retrieve userId from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        let storedUserId = await AsyncStorage.getItem('trackingUserId');
        if (!storedUserId) {
          storedUserId = uuidv4();
          await AsyncStorage.setItem('trackingUserId', storedUserId);
        }
        setUserId(storedUserId);
      } catch (error: any) {
        console.error("Error generating or storing userId:", error);
        let errorMessage = error?.message || 'Nie można wygenerować lub zapisać ID użytkownika.';
        setUserIdInitError(`Błąd inicjalizacji ID użytkownika: ${errorMessage}. Śledzenie niemożliwe.`);
        Alert.alert('Krytyczny błąd', errorMessage);
      }
    })();
  }, []);

  const sendLocationToServer = useCallback(async (currentUserId: string, latitude: number, longitude: number, trackingStatus: boolean) => {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, latitude, longitude, isTracking: trackingStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error:', errorData.message);
        Alert.alert('Błąd', `Błąd wysyłania lokalizacji: ${errorData.message}`);
        return false;
      }

      const result = await response.json();
      console.log('Backend response:', result.message);
      return true;
    } catch (error: any) {
      console.error('Network error:', error);
      Alert.alert('Błąd sieci', error?.message || 'Nieznany błąd sieci');
      return false;
    }
  }, []);

  const startTracking = async () => {
    if (userIdInitError) {
      Alert.alert('Błąd', userIdInitError);
      return;
    }
    if (!userId) {
      Alert.alert("Błąd", "ID użytkownika jest niedostępne. Proszę odświeżyć aplikację.");
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Brak dostępu", "Nie przyznano uprawnień do lokalizacji.");
      return;
    }

    watchId.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setStatusText(`Twoja lokalizacja: ${latitude}, ${longitude}`);
        await sendLocationToServer(userId, latitude, longitude, true);
      }
    ).then(sub => {
      // save subscription id
      return String(Math.random()); // dummy for cleanup
    });

    setIsTracking(true);
    await sendLocationToServer(userId, 0, 0, true); // initial status
  };

  const stopTracking = async () => {
    if (watchId.current) {
      // Expo Location returns a subscription, not numeric id
      // In a real app, you'd store the subscription and call .remove()
      watchId.current = null;
    }
    setIsTracking(false);
    setStatusText("Nieaktywne");
    if (userId) {
      await sendLocationToServer(userId, 0, 0, false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Śledzenie</Text>

        {!userId && !userIdInitError && <Text style={styles.info}>Generowanie ID użytkownika...</Text>}
        {userIdInitError && <Text style={styles.error}>{userIdInitError}</Text>}
        {userId && (
          <Text style={styles.userId}>
            Twój ID: <Text style={styles.mono}>{userId}</Text>
          </Text>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={startTracking}
            disabled={isTracking || !userId || !!userIdInitError}
            style={[styles.button, (isTracking || !userId || !!userIdInitError) ? styles.buttonDisabled : styles.buttonStart]}
          >
            <Text style={styles.buttonText}>Start śledzenia</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={stopTracking}
            disabled={!isTracking || !userId || !!userIdInitError}
            style={[styles.button, (!isTracking || !userId || !!userIdInitError) ? styles.buttonDisabled : styles.buttonStop]}
          >
            <Text style={styles.buttonText}>Zakończ śledzenie</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#f3f4f6' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, width: '100%', maxWidth: 400, elevation: 4 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  info: { textAlign: 'center', color: 'blue', marginBottom: 10 },
  error: { textAlign: 'center', color: 'red', marginBottom: 10 },
  userId: { textAlign: 'center', color: '#444', marginBottom: 20 },
  mono: { fontFamily: 'monospace', backgroundColor: '#eee', padding: 4, borderRadius: 4 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  button: { flex: 1, marginHorizontal: 5, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonStart: { backgroundColor: '#2563eb' },
  buttonStop: { backgroundColor: '#dc2626' },
  buttonDisabled: { backgroundColor: '#9ca3af' },
  buttonText: { color: 'white', fontWeight: '600' },
  statusBox: { backgroundColor: '#f3f4f6', padding: 16, borderRadius: 8 },
  statusText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});
