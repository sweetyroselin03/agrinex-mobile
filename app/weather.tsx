import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  CloudSun, 
  Droplet, 
  Wind, 
  Sun, 
  CloudRain, 
  Thermometer,
  Navigation,
  Sunrise,
  Sunset,
  CloudLightning as LucideCloudLightning,
  Cloud as LucideCloud,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Compass,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Colors from '../constants/Colors';
import { useAppTheme } from '../hooks/useAppTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

// Safe Icon Resolution to prevent component undefined crashes
const Cloud = LucideCloud || CloudSun;
const CloudLightning = LucideCloudLightning || CloudRain || CloudSun;

// Predefined fallback regions for manual selection
const REGIONS = [
  { name: 'Maharashtra, IN', lat: 19.076, lon: 72.8777 },
  { name: 'Punjab, IN', lat: 31.1471, lon: 75.3412 },
  { name: 'Karnataka, IN', lat: 12.9716, lon: 77.5946 },
  { name: 'Gujarat, IN', lat: 22.2587, lon: 71.1924 },
  { name: 'Tamil Nadu, IN', lat: 11.1271, lon: 78.6569 },
];

const DEMO_WEATHER = {
  temp: 32,
  condition: 'Partly Cloudy',
  humidity: 45,
  wind: 12,
  uv_index: 6.0,
  rain_probability: 20,
  soil_moisture: 'Moderate — Monitor irrigation needs',
  farming_suitability: 'Good — Most activities suitable',
  location: 'Maharashtra, India',
  sunrise: '05:42 AM',
  sunset: '06:54 PM',
  alerts: [
    { type: 'good', severity: 'low', message: '✅ Favorable weather conditions for spraying.', icon: 'CheckCircle' }
  ],
  forecast: [
    { day: 'Mon', temp: 31, condition: 'Sunny', icon: 'Sun' },
    { day: 'Tue', temp: 29, condition: 'Cloudy', icon: 'Cloud' },
    { day: 'Wed', temp: 28, condition: 'Rain', icon: 'CloudRain' },
    { day: 'Thu', temp: 30, condition: 'Sunny', icon: 'Sun' },
    { day: 'Fri', temp: 32, condition: 'Partly Cloudy', icon: 'CloudSun' },
    { day: 'Sat', temp: 33, condition: 'Sunny', icon: 'Sun' },
    { day: 'Sun', temp: 31, condition: 'Stormy', icon: 'CloudLightning' },
  ]
};

export default function WeatherScreen() {
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();

  const [weather, setWeather] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('GPS');
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadWeatherData();
  }, []);

  const loadWeatherData = async (lat?: number, lon?: number, regionName?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let targetLat = lat;
      let targetLon = lon;

      if (!targetLat || !targetLon) {
        setLocationStatus('Requesting GPS location...');
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            targetLat = loc.coords.latitude;
            targetLon = loc.coords.longitude;
            setSelectedRegion('GPS');
            setLocationStatus('');
          } else {
            setErrorMsg('GPS location access denied. Using fallback region.');
            setSelectedRegion('Maharashtra, IN');
            targetLat = REGIONS[0].lat;
            targetLon = REGIONS[0].lon;
          }
        } catch (e) {
          setErrorMsg('Location services unavailable. Using manual region.');
          setSelectedRegion('Maharashtra, IN');
          targetLat = REGIONS[0].lat;
          targetLon = REGIONS[0].lon;
        }
      }

      if (regionName) {
        setSelectedRegion(regionName);
      }

      setLocationStatus('Fetching live agricultural weather...');
      const response = await client.get(`/weather/current?lat=${targetLat}&lon=${targetLon}`);
      
      if (response.data) {
        let loc = response.data.location || 'Maharashtra, India';
        if (loc.includes('India, India')) loc = loc.replace('India, India', 'India');
        const weatherData = { ...response.data, location: loc };
        setWeather(weatherData);
        await AsyncStorage.setItem('agrinex_weather_cache', JSON.stringify(weatherData));
      } else {
        throw new Error('Invalid weather payload');
      }
    } catch (error) {
      console.error('Weather fetching failed', error);
      setErrorMsg('Unable to fetch live weather data. Displaying cached/demo data.');
      const cached = await AsyncStorage.getItem('agrinex_weather_cache');
      if (cached) {
        setWeather(JSON.parse(cached));
      } else {
        setWeather(DEMO_WEATHER);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLocationStatus('');
    }
  };

  const handleRegionSelect = (region: any) => {
    loadWeatherData(region.lat, region.lon, region.name);
  };

  const handleGPSTap = () => {
    loadWeatherData();
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedRegion === 'GPS') {
      loadWeatherData();
    } else {
      const reg = REGIONS.find(r => r.name === selectedRegion);
      if (reg) {
        loadWeatherData(reg.lat, reg.lon, reg.name);
      } else {
        loadWeatherData();
      }
    }
  };

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain color="#3B82F6" size={64} />;
    if (c.includes('cloud') || c.includes('overcast')) return <CloudSun color="#059669" size={64} />;
    if (c.includes('storm') || c.includes('thunder')) return <CloudLightning color="#8B5CF6" size={64} />;
    return <Sun color="#F59E0B" size={64} />;
  };

  const getForecastIcon = (iconName: string) => {
    const name = (iconName || 'Sun').toLowerCase();
    if (name.includes('rain') || name.includes('drizzle')) {
      return <CloudRain color="#3B82F6" size={28} />;
    }
    if (name.includes('cloudsun') || name.includes('cloudy') || name.includes('partly')) {
      return <CloudSun color="#10B981" size={28} />;
    }
    if (name.includes('cloud') || name.includes('overcast')) {
      const CloudIcon = Cloud || CloudSun;
      return <CloudIcon color="#94A3B8" size={28} />;
    }
    if (name.includes('lightning') || name.includes('storm') || name.includes('thunder')) {
      return <CloudLightning color="#8B5CF6" size={28} />;
    }
    return <Sun color="#F59E0B" size={28} />;
  };

  // Generate dynamic, premium agronomic crop advice based on coordinates / current conditions
  const getCropRecommendations = () => {
    if (!weather) return [];
    const recommendations = [];
    const temp = weather.temp || 30;
    const rainProb = weather.rain_probability || 0;
    const wind = weather.wind || 0;
    const humidity = weather.humidity || 50;

    if (temp > 35) {
      recommendations.push({
        title: 'Irrigation Management',
        desc: 'Extreme temperature detected. Irrigate crops during evening or early morning to minimize evaporation loss.',
      });
      recommendations.push({
        title: 'Crop Protection',
        desc: 'Consider deploying shade nets over vegetable nurseries (e.g., tomatoes, chillies) to safeguard against sun scald.',
      });
    } else {
      recommendations.push({
        title: 'Irrigation Management',
        desc: `Soil moisture condition is ${weather.soil_moisture?.split('—')[0] || 'moderate'}. Schedule watering according to crop stage.`,
      });
    }

    if (rainProb > 50) {
      recommendations.push({
        title: 'Chemical Applications',
        desc: `High probability of rainfall (${rainProb}%). Postpone all pesticide and fungicide sprays to avoid run-off.`,
      });
      recommendations.push({
        title: 'Field Prep',
        desc: 'Ensure clearing of all drain inlets to avoid waterlogging, especially in low-lying crop fields.',
      });
    } else if (wind > 20) {
      recommendations.push({
        title: 'Foliar Spray Suitability',
        desc: `High winds (${wind} km/h) can cause chemical drift. Avoid drone or manual spraying today.`,
      });
    } else {
      recommendations.push({
        title: 'Foliar Nutrition',
        desc: 'Wind speeds and rain chances are optimal. Excellent time for foliar feeding or organic NPK sprays.',
      });
    }

    if (humidity > 80) {
      recommendations.push({
        title: 'Pest & Disease Alert',
        desc: 'High relative humidity favors downy mildew and blast diseases. Inspect leaves daily for fungal spot development.',
      });
    } else {
      recommendations.push({
        title: 'Sowing Conditions',
        desc: 'Soil temperature and humidity are highly favorable. Good window for planting cotton, maize, or legumes.',
      });
    }

    return recommendations;
  };

  if (!theme) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          activeOpacity={0.7}
        >
          <ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Agri Weather</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Region Selector & Location Chips */}
      <View style={styles.chipContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <TouchableOpacity 
            style={[
              styles.locationChip, 
              { backgroundColor: selectedRegion === 'GPS' ? theme.primary : theme.card, borderColor: theme.border }
            ]}
            onPress={handleGPSTap}
            activeOpacity={0.8}
          >
            <Compass size={14} color={selectedRegion === 'GPS' ? 'white' : theme.primary} />
            <Text style={[styles.chipText, { color: selectedRegion === 'GPS' ? 'white' : theme.text }]}>GPS Position</Text>
          </TouchableOpacity>

          {REGIONS.map((region, index) => {
            const isSelected = selectedRegion === region.name;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.locationChip, 
                  { backgroundColor: isSelected ? theme.primary : theme.card, borderColor: theme.border }
                ]}
                onPress={() => handleRegionSelect(region)}
                activeOpacity={0.8}
              >
                <MapPin size={14} color={isSelected ? 'white' : theme.textLight} />
                <Text style={[styles.chipText, { color: isSelected ? 'white' : theme.text }]}>{region.name.split(',')[0]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Loading overlay for switching locations */}
      {loading && !weather ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>{locationStatus || 'Loading weather parameters...'}</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Live Alert Banner */}
          {errorMsg && (
            <Animated.View 
              entering={FadeInDown.duration(400)}
              style={[styles.errorBanner, { backgroundColor: isDarkMode ? '#7F1D1D' : '#FEF2F2', borderColor: isDarkMode ? '#B91C1C' : '#FCA5A5' }]}
            >
              <AlertTriangle color={isDarkMode ? '#FCA5A5' : '#EF4444'} size={18} />
              <Text style={[styles.errorText, { color: isDarkMode ? '#FECACA' : '#991B1B' }]}>{errorMsg}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.errorRetryBtn}>
                <Text style={styles.errorRetryText}>Retry</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Current Location Display */}
          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.locationTitleContainer}>
            <MapPin size={16} color={theme.primary} />
            <Text style={[styles.locationName, { color: theme.text }]}>{weather?.location || 'Maharashtra, India'}</Text>
          </Animated.View>

          {/* Main Weather Card */}
          <Animated.View 
            entering={FadeInUp.delay(150).duration(600)}
            style={[styles.mainWeatherCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.mainWeatherInfo}>
              <View>
                <Text style={[styles.temperature, { color: theme.text }]}>{Math.round(weather?.temp || 32)}°</Text>
                <Text style={[styles.condition, { color: theme.textLight }]}>{weather?.condition || 'Partly Cloudy'}</Text>
              </View>
              {getWeatherIcon(weather?.condition || 'Partly Cloudy')}
            </View>

            {/* Weather Metrics Grid */}
            <View style={[styles.weatherMetrics, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : '#F8FAFC', borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.metricItem}>
                <Droplet color="#3B82F6" size={20} />
                <Text style={[styles.metricVal, { color: theme.text }]}>{weather?.humidity}%</Text>
                <Text style={[styles.metricLabel, { color: theme.textLight }]}>Humidity</Text>
              </View>
              <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
              
              <View style={styles.metricItem}>
                <Wind color="#10B981" size={20} />
                <Text style={[styles.metricVal, { color: theme.text }]}>{weather?.wind} km/h</Text>
                <Text style={[styles.metricLabel, { color: theme.textLight }]}>Wind Speed</Text>
              </View>
              <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />

              <View style={styles.metricItem}>
                <Sun color="#F59E0B" size={20} />
                <Text style={[styles.metricVal, { color: theme.text }]}>{weather?.uv_index !== undefined ? weather.uv_index : 6.0}</Text>
                <Text style={[styles.metricLabel, { color: theme.textLight }]}>UV Index</Text>
              </View>
              <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />

              <View style={styles.metricItem}>
                <CloudRain color="#0284C7" size={20} />
                <Text style={[styles.metricVal, { color: theme.text }]}>{weather?.rain_probability !== undefined ? weather.rain_probability : 20}%</Text>
                <Text style={[styles.metricLabel, { color: theme.textLight }]}>Rain Chance</Text>
              </View>
            </View>
          </Animated.View>

          {/* Smart Crop Recommendations Section */}
          <Animated.View entering={FadeInUp.delay(200).duration(600)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Smart Crop Recommendations</Text>
            </View>
            <View style={[styles.recommendationBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {getCropRecommendations().map((rec, idx) => (
                <View key={idx} style={[styles.recItem, idx > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : {}] as any}>
                  <View style={[styles.recDot, { backgroundColor: theme.primary }]} />
                  <View style={styles.recTextContent}>
                    <Text style={[styles.recTitle, { color: theme.text }]}>{rec.title}</Text>
                    <Text style={[styles.recDesc, { color: theme.textLight }]}>{rec.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* System Alerts */}
          {weather?.alerts && weather.alerts.length > 0 && (
            <Animated.View entering={FadeInUp.delay(250).duration(600)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Weather Advisory & Warnings</Text>
              </View>
              {weather.alerts.map((alert: any, idx: number) => {
                const isGood = alert.type === 'good';
                return (
                  <View 
                    key={idx} 
                    style={[
                      styles.alertCard, 
                      { 
                        backgroundColor: isGood ? (isDarkMode ? '#064e3b' : '#ECFDF5') : (isDarkMode ? '#7c2d12' : '#FFF7ED'),
                        borderColor: isGood ? '#10B981' : '#F97316'
                      }
                    ] as any}
                  >
                    {isGood ? <CheckCircle2 color="#10B981" size={20} /> : <AlertTriangle color="#F97316" size={20} />}
                    <Text style={[styles.alertMessage, { color: isGood ? (isDarkMode ? '#a7f3d0' : '#065f46') : (isDarkMode ? '#ffedd5' : '#9a3412') }]}>
                      {alert.message}
                    </Text>
                  </View>
                );
              })}
            </Animated.View>
          )}

          {/* 7-Day Forecast */}
          <Animated.View entering={FadeInUp.delay(300).duration(600)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>7-Day Forecast</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastScroll}>
              {weather?.forecast?.map((item: any, idx: number) => (
                <View key={idx} style={[styles.forecastCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                  <Text style={[styles.forecastDay, { color: theme.textLight }]}>{item.day}</Text>
                  <View style={styles.forecastIconWrapper}>
                    {getForecastIcon(item.icon)}
                  </View>
                  <Text style={[styles.forecastTemp, { color: theme.text }]}>{Math.round(item.temp)}°</Text>
                  <Text style={[styles.forecastCond, { color: theme.textLight }]}>{item.condition}</Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Sunrise/Sunset */}
          <Animated.View entering={FadeInUp.delay(350).duration(600)} style={[styles.sunCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.sunItem}>
              <Sunrise color="#F59E0B" size={24} />
              <View>
                <Text style={[styles.sunTime, { color: theme.text }]}>{weather?.sunrise || '05:42 AM'}</Text>
                <Text style={[styles.sunLabel, { color: theme.textLight }]}>Sunrise</Text>
              </View>
            </View>
            <View style={[styles.sunDivider, { backgroundColor: theme.border }]} />
            <View style={styles.sunItem}>
              <Sunset color="#EA580C" size={24} />
              <View>
                <Text style={[styles.sunTime, { color: theme.text }]}>{weather?.sunset || '06:54 PM'}</Text>
                <Text style={[styles.sunLabel, { color: theme.textLight }]}>Sunset</Text>
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  chipContainer: {
    marginBottom: 8,
  },
  chipScroll: {
    paddingHorizontal: 24,
    gap: 8,
    paddingBottom: 4,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  errorRetryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  errorRetryText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  locationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingLeft: 4,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '800',
  },
  mainWeatherCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  mainWeatherInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  temperature: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -2,
  },
  condition: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: -2,
  },
  weatherMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  recommendationBox: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  recItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  recTextContent: {
    flex: 1,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  recDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  alertMessage: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  forecastScroll: {
    paddingBottom: 10,
    gap: 10,
  },
  forecastCard: {
    padding: 16,
    borderRadius: 22,
    alignItems: 'center',
    width: 105,
    borderWidth: 1,
  },
  forecastDay: {
    fontSize: 13,
    fontWeight: '700',
  },
  forecastIconWrapper: {
    marginVertical: 10,
    height: 32,
    justifyContent: 'center',
  },
  forecastTemp: {
    fontSize: 18,
    fontWeight: '800',
  },
  forecastCond: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  sunCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 22,
    marginTop: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
  },
  sunItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sunTime: {
    fontSize: 15,
    fontWeight: '800',
  },
  sunLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  sunDivider: {
    width: 1,
    height: 28,
  },
});
