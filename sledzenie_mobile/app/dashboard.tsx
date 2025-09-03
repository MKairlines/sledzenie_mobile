// app/Dashboard.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';

// Interfejs lokalizacji
interface TrackedLocation {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: number; // Unix timestamp
  isTracking: boolean;
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [activeLocations, setActiveLocations] = useState<TrackedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = 'https://sledzenie-psi.vercel.app/api/track-location';
  const POLLING_INTERVAL_MS = 3000;

  const fetchLocations = async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Błąd pobierania lokalizacji z backendu');
      }
      const data: TrackedLocation[] = await response.json();
      setActiveLocations(data);
    } catch (err: unknown) {
      console.error('Error fetching locations:', err);
      let errorMessage = 'Nieznany błąd.';
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const intervalId = setInterval(fetchLocations, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Ładowanie dashboardu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const initialRegion = {
    latitude: activeLocations.length > 0 ? activeLocations[0].latitude : 52.2297,
    longitude: activeLocations.length > 0 ? activeLocations[0].longitude : 21.0122,
    latitudeDelta: 5,
    longitudeDelta: 5,
  };

  const goBackToHome = () => {
    navigation.navigate('Home' as never); // Navigate back to Home screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Dashboard śledzenia lokalizacji</Text>

      {/* Map section */}
      <MapView style={styles.map} initialRegion={initialRegion}>
        {activeLocations.map((loc) => (
          <Marker
            key={loc.userId}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            title={`Użytkownik: ${loc.userId}`}
            description={`Ostatnia aktualizacja: ${new Date(loc.timestamp).toLocaleString()}`}
          />
        ))}
      </MapView>

      {/* List section */}
      <FlatList
        style={styles.list}
        data={activeLocations}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.userId}>{item.userId}</Text>
            <Text style={styles.coords}>
              {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      />

      {/* Go back button */}
      <TouchableOpacity onPress={goBackToHome} style={styles.backButton}>
        <Text style={styles.backButtonText}>Powrót do śledzenia</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
    color: '#1f2937',
  },
  map: {
    flex: 1,
    minHeight: 300,
  },
  list: {
    flex: 1,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  coords: {
    fontSize: 12,
    color: '#6b7280',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2563eb',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
  },
  backButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
