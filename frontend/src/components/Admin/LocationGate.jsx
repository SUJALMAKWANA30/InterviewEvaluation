import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Loader, RefreshCw, QrCode } from 'lucide-react';
import { getUserLocation, isWithinRadius, getGeolocationErrorMessage } from '../../utils/geolocation';

const QUIZ_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const LOCATION_API_BASE = QUIZ_BACKEND_URL
  ? `${QUIZ_BACKEND_URL}/api`
  : (import.meta.env.VITE_API_URL || '/api');

// Get token from URL
const getTokenFromURL = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token');
};

// Fetch location from backend using token
const fetchLocationFromToken = async (token) => {
  try {
    const response = await fetch(`${LOCATION_API_BASE}/location/validate?token=${token}`);
    const data = await response.json();
    
    if (data.success) {
      return {
        lat: data.lat,
        lon: data.lon,
        maxRadius: data.maxRadius || 200,
        isValid: true,
        bypassLocation: data.bypassLocation || false  // Emergency bypass flag
      };
    }
    return { lat: null, lon: null, maxRadius: 200, isValid: false, bypassLocation: false, error: data.message };
  } catch (error) {
    console.error('Error fetching location:', error);
    return { lat: null, lon: null, maxRadius: 200, isValid: false, bypassLocation: false, error: 'Server connection failed' };
  }
};

export default function LocationGate({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking', 'granted', 'denied', 'error', 'no-qr'
  const [error, setError] = useState('');
  const [distance, setDistance] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [allowedLocation, setAllowedLocation] = useState(null);
  const [permissionState, setPermissionState] = useState('unknown'); // 'unknown' | 'granted' | 'prompt' | 'denied'
  const [permissionChecked, setPermissionChecked] = useState(false);

  const checkLocation = async () => {
    const token = getTokenFromURL();
    
    // Check if token is provided in URL
    if (!token) {
      setStatus('no-qr');
      setError('No access token found. Please scan the QR code at the examination center.');
      return;
    }

    setStatus('checking');
    setError('');

    // Fetch location from backend
    const locationData = await fetchLocationFromToken(token);
    
    if (!locationData.isValid) {
      setStatus('no-qr');
      setError(locationData.error || 'Invalid or expired token. Please scan a valid QR code.');
      return;
    }

    setAllowedLocation(locationData);

    // TPAccess bypass - skip location check entirely
    if (locationData.bypassLocation) {
      console.log('🔓 Emergency bypass token detected - skipping location check');
      setStatus('granted');
      return;
    }

    try {
      const location = await getUserLocation();
      setUserCoords({
        lat: location.latitude,
        lon: location.longitude
      });

      const result = isWithinRadius(
        location.latitude,
        location.longitude,
        locationData.lat,
        locationData.lon,
        locationData.maxRadius
      );

      setDistance(result.distance);

      if (result.isWithinRadius) {
        setStatus('granted');
      } else {
        setStatus('denied');
        setError(`You are ${result.distance} meters away from the authorized location. Access is only allowed within ${locationData.maxRadius} meters.`);
      }
    } catch (err) {
      setStatus('error');
      setError(getGeolocationErrorMessage(err));
    }
  };

  useEffect(() => {
    checkLocation();
  }, []);
  
  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const p = await navigator.permissions.query({ name: 'geolocation' });
          setPermissionState(p.state);
          setPermissionChecked(true);
          p.onchange = () => setPermissionState(p.state);
        } else {
          setPermissionChecked(true);
        }
      } catch {
        setPermissionChecked(true);
      }
    };
    checkPermission();
  }, []);
  
  const requestLocationPermission = async () => {
    try {
      const loc = await getUserLocation();
      setUserCoords({ lat: loc.latitude, lon: loc.longitude });
      setPermissionState('granted');
    } catch (err) {
      setPermissionState('denied');
      setError(getGeolocationErrorMessage(err));
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    },
    card: {
      width: '100%',
      maxWidth: '450px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      padding: '40px',
      textAlign: 'center',
    },
    iconBox: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      marginBottom: '20px',
    },
    iconBoxChecking: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    iconBoxDenied: {
      background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
    },
    iconBoxError: {
      background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
    },
    iconBoxNoQR: {
      background: 'linear-gradient(135deg, #805ad5 0%, #6b46c1 100%)',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1a202c',
      margin: '10px 0',
    },
    subtitle: {
      color: '#718096',
      fontSize: '14px',
      marginBottom: '20px',
      lineHeight: '1.6',
    },
    errorText: {
      color: '#c53030',
      fontSize: '14px',
      marginBottom: '20px',
      padding: '15px',
      background: '#fee2e2',
      borderRadius: '8px',
    },
    button: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    spinner: {
      animation: 'spin 1s linear infinite',
    },
    infoBox: {
      marginTop: '20px',
      padding: '15px',
      background: '#f7fafc',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#718096',
    },
    locationInfo: {
      marginTop: '15px',
      padding: '10px',
      background: '#e9ecef',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#495057',
      textAlign: 'left',
    }
  };

  // Add spinner animation
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  // If access is granted, render children (the actual login page)
  if (status === 'granted') {
    return children;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {status === 'no-qr' && (
          <>
            <div style={{ ...styles.iconBox, ...styles.iconBoxNoQR }}>
              <QrCode size={40} color="white" />
            </div>
            <h1 style={styles.title}>QR Code Required</h1>
            <p style={styles.subtitle}>
              Please scan the QR code at the examination center to access this system.
            </p>
            <div style={styles.errorText}>
              {error}
            </div>
            <button
              style={{ ...styles.button, marginTop: '12px' }}
              onClick={requestLocationPermission}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <MapPin size={18} />
              Enable Location
            </button>
            <div style={styles.infoBox}>
              <strong>How it works:</strong><br />
              1. Go to the authorized examination center<br />
              2. Scan the QR code displayed at the location<br />
              3. Your location will be verified automatically
              {permissionChecked && (
                <div style={styles.locationInfo}>
                  <strong>Browser Location Permission:</strong> {permissionState}
                </div>
              )}
            </div>
          </>
        )}

        {status === 'checking' && (
          <>
            <div style={{ ...styles.iconBox, ...styles.iconBoxChecking }}>
              <Loader size={40} color="white" style={styles.spinner} />
            </div>
            <h1 style={styles.title}>Verifying Location</h1>
            <p style={styles.subtitle}>
              Please allow location access when prompted.<br />
              We need to verify you are at the authorized location.
            </p>
          </>
        )}

        {status === 'denied' && (
          <>
            <div style={{ ...styles.iconBox, ...styles.iconBoxDenied }}>
              <MapPin size={40} color="white" />
            </div>
            <h1 style={styles.title}>Access Denied</h1>
            <p style={styles.subtitle}>
              You are not at the authorized location.
            </p>
            <div style={styles.errorText}>
              {error}
            </div>
            <button 
              style={styles.button}
              onClick={checkLocation}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <RefreshCw size={18} />
              Check Again
            </button>
            <div style={styles.infoBox}>
              <strong>Note:</strong> This system is only accessible from the authorized examination center.
              {allowedLocation && allowedLocation.isValid && (
                <div style={styles.locationInfo}>
                  <strong>Allowed Radius:</strong> {allowedLocation.maxRadius} meters
                </div>
              )}
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ ...styles.iconBox, ...styles.iconBoxError }}>
              <AlertTriangle size={40} color="white" />
            </div>
            <h1 style={styles.title}>Location Error</h1>
            <p style={styles.subtitle}>
              Unable to verify your location.
            </p>
            <div style={styles.errorText}>
              {error}
            </div>
            <button 
              style={styles.button}
              onClick={checkLocation}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <RefreshCw size={18} />
              Try Again
            </button>
            <div style={styles.infoBox}>
              <strong>Tip:</strong> Make sure location services are enabled in your browser and device settings.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
