/**
 * Geolocation Utilities
 * Functions to handle GPS coordinates and distance calculations
 */

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
};

/**
 * Check if user is within specified radius of venue
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} venueLat - Venue latitude
 * @param {number} venueLon - Venue longitude
 * @param {number} maxRadius - Maximum allowed distance in meters (default 10)
 * @returns {object} Object with isWithinRadius and distance
 */
export const isWithinRadius = (
  userLat,
  userLon,
  venueLat,
  venueLon,
  maxRadius = 10
) => {
  const distance = calculateDistance(userLat, userLon, venueLat, venueLon);
  return {
    isWithinRadius: distance <= maxRadius,
    distance: Math.round(distance),
    maxRadius,
  };
};

/**
 * Get user's current location
 * @returns {Promise} Promise that resolves with { latitude, longitude, accuracy }
 */
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
        });
      },
      (error) => {
        reject(error);
      },
      options
    );
  });
};

/**
 * Watch user's location in real-time
 * @param {function} onSuccess - Callback for location updates
 * @param {function} onError - Callback for errors
 * @returns {number} Watch ID (use to stop watching)
 */
export const watchUserLocation = (onSuccess, onError) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported'));
    return null;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(),
      });
    },
    (error) => {
      onError(error);
    },
    options
  );
};

/**
 * Stop watching user location
 * @param {number} watchId - Watch ID from watchUserLocation
 */
export const stopWatchingLocation = (watchId) => {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Get error message for geolocation errors
 * @param {object} error - GeolocationPositionError object
 * @returns {string} Error message
 */
export const getGeolocationErrorMessage = (error) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'You have denied access to your location. Please enable location access in your browser settings.';
    case error.POSITION_UNAVAILABLE:
      return 'Your location information is currently unavailable.';
    case error.TIMEOUT:
      return 'The request to get your location timed out.';
    default:
      return 'An error occurred while getting your location.';
  }
};
