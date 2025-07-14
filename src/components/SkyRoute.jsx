import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Cloud, Sun, CloudRain, AlertTriangle, Wifi, WifiOff, Wind, Droplets, Eye, Thermometer } from 'lucide-react';
import polyline from '@mapbox/polyline';
// top of your script


const OPENWEATHER_API_KEY =import.meta.env.VITE_OPENWEATHER_API_KEY
const OPENROUTE_API_KEY = import.meta.env.VITE_OPENROUTE_API_KEY;

const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    isSlowConnection: false
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      setNetworkStatus({
        isOnline: navigator.onLine,
        connectionType: connection?.effectiveType || 'unknown',
        isSlowConnection: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g' || connection?.effectiveType === '3g'
      });
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateNetworkStatus);
    }

    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return networkStatus;
};

const fetchWeatherData = async (lat, lon) => {
   
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};

const fetchRouteData = async (startCoords, endCoords) => {
  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${OPENROUTE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [startCoords, endCoords],
          format: 'geojson'
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Route API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching route data:', error);
    throw error;
  }
};

const geocodeLocation = async (locationString) => {
  try {
    const response = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${OPENROUTE_API_KEY}&text=${encodeURIComponent(locationString)}`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
    throw new Error('Location not found');
  } catch (error) {
    console.error('Error geocoding location:', error);
    throw error;
  }
};


const ConnectionManager = ({ children, onConnectionChange,status }) => {
  const [connectionInfo, setConnectionInfo] = useState({
    effectiveType: '5g',
    downlink: 10,
    rtt: 50,
    saveData: false
  });

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      const updateConnectionInfo = () => {
        const info = {
          effectiveType: connection.effectiveType || '5g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 50,
          saveData: connection.saveData || false
        };
        setConnectionInfo(info);
        onConnectionChange?.(info);
      };

      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
      
      return () => connection.removeEventListener('change', updateConnectionInfo);
    }
  }, []);

  const isSlowConnection = connectionInfo.effectiveType === 'slow-2g' || connectionInfo.effectiveType === '2g';

  return (
    <div className="relative">
      <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-2 border">
        <div className="flex items-center space-x-2 text-sm">
          {!status.isOnline ? (
            <WifiOff className="w-4 h-4 text-red-500" />
          ) : (
            <Wifi className="w-4 h-4 text-green-500" />
          )}
          <span className={`font-medium ${!status.isOnline ? 'text-red-600' : 'text-green-600'}`}>
            {status.isOnline?"5G":"OffLine"}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
};


const RouteInput = ({ onRouteSubmit, currentLocation, onLocationDetect }) => {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  const handleCurrentLocation = async () => {
    setIsDetecting(true);
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            onLocationDetect({ lat: latitude, lon: longitude });
            setStartLocation(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
            setIsDetecting(false);
          },
          (error) => {
            console.error('Geolocation error:', error);
            setIsDetecting(false);
          }
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setIsDetecting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (startLocation && endLocation) {
      onRouteSubmit({ start: startLocation, end: endLocation });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <Navigation className="w-6 h-6 mr-2 text-blue-600" />
        Plan Your Route
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Starting Location
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              placeholder="Enter starting location"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={isDetecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <MapPin className="w-4 h-4 mr-1" />
              {isDetecting ? 'Detecting...' : 'Current'}
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destination
          </label>
          <input
            type="text"
            value={endLocation}
            onChange={(e) => setEndLocation(e.target.value)}
            placeholder="Enter destination"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
        >
          Get Weather Route
        </button>
      </div>
    </div>
  );
};


const RouteMap = ({ route, weatherPoints }) => {
  if (!route) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <MapPin className="w-5 h-5 mr-2 text-green-600" />
        Route Overview
      </h3>
      
      <div className="bg-gray-100 rounded-lg p-4 h-64 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100"></div>
        
   
        <div className="relative z-10 w-full h-full">
          <div className="flex items-center justify-between h-full">
            <div className="text-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
              <span className="text-sm font-medium text-gray-700">Start</span>
            </div>
            
            <div className="flex-1 h-1 bg-blue-500 mx-4 relative">
              {weatherPoints.map((point, index) => (
                <div
                  key={index}
                  className="absolute w-3 h-3 bg-yellow-500 rounded-full transform -translate-y-1"
                  style={{ left: `${(index + 1) * (100 / (weatherPoints.length + 1))}%` }}
                ></div>
              ))}
            </div>
            
            <div className="text-center relative">

              <div className="relative mx-auto mb-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>

                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <MapPin className="w-6 h-6 text-red-600 drop-shadow-lg" />
                </div>

                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
              </div>
              <span className="text-sm font-medium text-gray-700">Destination</span>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-4 left-4 text-sm text-gray-600 bg-white px-2 py-1 rounded">
          Distance: {route.distance}km • Duration: {route.duration}min
        </div>
      </div>
    </div>
  );
};


const WeatherPointCard = ({ point, index, isVisible }) => {




  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isVisible && !weatherData && !loading) {
      setLoading(true);
      setError(null);
      
      fetchWeatherData(point.lat, point.lon)
        .then(data => {
            // console.log('Weather Data:', data);
          setWeatherData(data);

        })
        .catch(err => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isVisible, weatherData, loading, point]);

  const getWeatherIcon = (condition) => {
    switch (condition.toLowerCase()) {
      case 'clear': return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'clouds': return <Cloud className="w-8 h-8 text-gray-500" />;
      case 'rain':
      case 'drizzle': return <CloudRain className="w-8 h-8 text-blue-500" />;
      case 'snow': return <Cloud className="w-8 h-8 text-blue-200" />;
      case 'thunderstorm': return <AlertTriangle className="w-8 h-8 text-purple-500" />;
      case 'mist':
      case 'fog': return <Cloud className="w-8 h-8 text-gray-400" />;
      default: return <Sun className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getWeatherBadge = (condition) => {
    const colors = {
      clear: 'bg-yellow-100 text-yellow-800',
      clouds: 'bg-gray-100 text-gray-800',
      rain: 'bg-blue-100 text-blue-800',
      drizzle: 'bg-blue-100 text-blue-800',
      snow: 'bg-blue-50 text-blue-700',
      thunderstorm: 'bg-purple-100 text-purple-800',
      mist: 'bg-gray-100 text-gray-700',
      fog: 'bg-gray-100 text-gray-700'
    };
    return colors[condition.toLowerCase()] || colors.clear;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h4 className="text-lg font-semibold text-gray-800">Waypoint {index + 1}</h4>
        </div>
        <p className="text-red-600 text-sm">Failed to load weather data: {error}</p>
        <p className="text-gray-500 text-xs mt-1">Check your API key and internet connection</p>
      </div>
    );
  }

  if (!weatherData) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800">
          Waypoint {index + 1}
        </h4>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getWeatherBadge(weatherData.weather[0].main)}`}>
          {weatherData.weather[0].main}
        </span>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getWeatherIcon(weatherData.weather[0].main)}
          <div>
            <p className="text-3xl font-bold text-gray-800">{Math.round(weatherData.main.temp)}°C</p>
            <p className="text-sm text-gray-600 capitalize">{weatherData.weather[0].description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Feels like</p>
          <p className="text-lg font-semibold text-gray-700">{Math.round(weatherData.main.feels_like)}°C</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Droplets className="w-4 h-4 text-blue-500" />
          <span className="text-gray-600">Humidity: {weatherData.main.humidity}%</span>
        </div>
        <div className="flex items-center space-x-2">
          <Wind className="w-4 h-4 text-green-500" />
          <span className="text-gray-600">Wind: {weatherData.wind?.speed || 0}m/s</span>
        </div>
        <div className="flex items-center space-x-2">
          <Thermometer className="w-4 h-4 text-red-500" />
          <span className="text-gray-600">Pressure: {weatherData.main.pressure}hPa</span>
        </div>
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-purple-500" />
          <span className="text-gray-600">Visibility: {weatherData.visibility ? (weatherData.visibility / 1000).toFixed(1) : 'N/A'}km</span>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        Location: {weatherData.name ||'Unknown'} ({point.lat.toFixed(4)}, {point.lon.toFixed(4)})
      </div>
    </div>
  );
};


const EcoTips = ({ weatherData, route }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tips, setTips] = useState([]);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          generateTips();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [weatherData, route]);

  const generateTips = () => {
    if (!weatherData || weatherData.length === 0) return;
    
    const generatedTips = [];
    

    const avgTemp = weatherData.reduce((sum, point) => sum + (point.temp || 20), 0) / weatherData.length;
    const hasRain = weatherData.some(point => point.weather && point.weather.includes('rain'));
    const hasSnow = weatherData.some(point => point.weather && point.weather.includes('snow'));
    const highWind = weatherData.some(point => point.windSpeed > 10);
    
    if (avgTemp > 30) {
      generatedTips.push("🌡️ High temperatures expected - carry extra water and sun protection");
    } else if (avgTemp < 5) {
      generatedTips.push("🧊 Cold temperatures ahead - dress warmly and check for icy conditions");
    } else {
      generatedTips.push("🌤️ Comfortable temperatures along route - perfect for travel");
    }
    
    if (hasRain) {
      generatedTips.push("☔ Rain expected along route - pack waterproof gear and allow extra time");
    }
    
    if (hasSnow) {
      generatedTips.push("❄️ Snow conditions possible - check tire chains and drive carefully");
    }
    
    if (highWind) {
      generatedTips.push("💨 Strong winds detected - secure loose items and be cautious of crosswinds");
    }

    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour <= 10) {
      generatedTips.push("🌅 Early morning travel - excellent choice for avoiding traffic and heat");
    } else if (currentHour >= 11 && currentHour <= 15) {
      generatedTips.push("☀️ Midday travel - UV levels high, use sun protection");
    }
    

    if (route && route.duration > 120) {
      generatedTips.push("🚗 Long journey ahead - plan rest stops every 2 hours");
    }

    if (generatedTips.length === 0) {
      generatedTips.push(
        "🌿 Good weather conditions for travel",
        "🚗 Check vehicle before departure",
        "📱 Keep emergency contacts handy"
      );
    }
    
    setTips(generatedTips.slice(0, 4));
  };

  if (!isVisible) {
    return (
      <div ref={ref} className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <Sun className="w-5 h-5 mr-2 text-yellow-500" />
        Travel Recommendations
      </h3>
      
      <div className="space-y-3">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <p className="text-gray-700">{tip}</p>
          </div>
        ))}
      </div>
      
      {route && (
        <div className="mt-6 p-4 bg-blue-600 text-white rounded-lg">
          <p className="font-medium">
            🛣️ Route: {route.distance}km • {route.duration} minutes • 
            Best departure: Early morning for optimal conditions
          </p>
        </div>
      )}
    </div>
  );
};


const SkyRoute = () => {
  const [route, setRoute] = useState(null);
  const [weatherPoints, setWeatherPoints] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const networkStatus=useNetworkStatus()
  const [loading, setLoading] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [visibleCards, setVisibleCards] = useState({});
  
  const weatherCardRefs = useRef({});
  console.log(networkStatus)
  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardIndex = entry.target.dataset.cardIndex;
            setVisibleCards(prev => ({ ...prev, [cardIndex]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    Object.values(weatherCardRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [weatherPoints]);

  const handleRouteSubmit = async ({ start, end }) => {
  setLoading(true);
  setRoute(null);
  setWeatherPoints([]);
  
  try {
    let startCoords, endCoords;


    if (currentLocation && start.includes('Current Location')) {
      startCoords = [currentLocation.lon, currentLocation.lat];
    } else {
      const startGeocode = await geocodeLocation(start);
      startCoords = [startGeocode.lon, startGeocode.lat];
    }

    const endGeocode = await geocodeLocation(end);
    console.log('End Geocode:', endGeocode);
    endCoords = [endGeocode.lon, endGeocode.lat];


    const routeData = await fetchRouteData(startCoords, endCoords);
    console.log('Route Data:', routeData);


    if (!routeData.routes || routeData.routes.length === 0) {
      throw new Error('No route found between these locations');
    }
   
    const routeObj = routeData.routes[0];
    const decodedCoords = polyline.decode(routeObj.geometry);
    const coordinates = decodedCoords.map(([lat, lng]) => [lat, lng]);
    console.log('Decoded Coordinates:', coordinates);
    const distance = (routeObj.summary.distance / 1000).toFixed(1); 
    const duration = Math.round(routeObj.summary.duration / 60);   

    const processedRoute = {
      distance,
      duration,
      coordinates
    };
    console.log("routeObj:", routeObj);

    setRoute(processedRoute);
   

    const totalPoints = coordinates.length;
    console.log('Total Points:', totalPoints);
    const maxPoints = connectionInfo?.effectiveType === 'slow-2g' || connectionInfo?.effectiveType === '2g' ? 3 : 6;

    const selectedPoints = [];
    for (let i = 0; i < maxPoints && i < totalPoints; i++) {
      const index = Math.floor((i * (totalPoints - 1)) / (maxPoints - 1));
      const coord = coordinates[index];
      selectedPoints.push({
        lat: coord[0],
        lon: coord[1],
        index: i
      });
    }
    console.log('Selected Weather Points:', selectedPoints);
    setWeatherPoints(selectedPoints);

  } catch (error) {
    console.error('Error fetching route:', error);
    alert(`Error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};


  const handleLocationDetect = (location) => {
    setCurrentLocation(location);
  };

  const handleConnectionChange = (info) => {
    setConnectionInfo(info);
  };

  return (
    <ConnectionManager status={networkStatus} onConnectionChange={handleConnectionChange}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">

          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              <span className="text-blue-600">Sky</span>Route
            </h1>
            <p className="text-gray-600 text-lg">Smart Weather-Aware Route Tracking</p>
          </header>


          <RouteInput
            onRouteSubmit={handleRouteSubmit}
            currentLocation={currentLocation}
            onLocationDetect={handleLocationDetect}
          />


          {loading && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {route ? 'Loading weather data...' : 'Finding route and fetching weather conditions...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This may take a moment while we get real-time data
              </p>
            </div>
          )}

          {route && !loading && (
            <RouteMap route={route} weatherPoints={weatherPoints} />
          )}


          {weatherPoints.length > 0 && !loading && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Cloud className="w-6 h-6 mr-2 text-blue-600" />
                Weather Along Your Route
              </h2>
              
              {weatherPoints.map((point, index) => (
                <div
                  key={index}
                  ref={el => weatherCardRefs.current[index] = el}
                  data-card-index={index}
                >
                  <WeatherPointCard
                    point={point}
                    index={index}
                    isVisible={visibleCards[index]}
                  />
                </div>
              ))}
            </div>
          )}

          {route && !loading && (
            <div className="mt-8">
              <EcoTips weatherData={weatherPoints} route={route} />
            </div>
          )}

          <footer className="mt-12 text-center text-gray-500 text-sm">
            <p>SkyRoute • Weather-aware travel planning by <span className='font-bold'>Rahbar samir</span> • Real-time conditions</p>
          </footer>
        </div>
      </div>
    </ConnectionManager>
  );
};

export default SkyRoute;