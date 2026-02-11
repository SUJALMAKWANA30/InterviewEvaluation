import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Mail, Lock, AlertCircle, Loader } from 'lucide-react';
const BACKEND_API_URL = import.meta.env.VITE_API_URL || '/api';

export default function UserRegistration() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationPermission, setLocationPermission] = useState(false);
  const navigate = useNavigate();

  // Get user's location
  useEffect(() => {
    requestLocationAccess();
  }, []);

  const requestLocationAccess = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ latitude, longitude, accuracy });
        setLocationPermission(true);
        setLocationError('');

        // Verify location is within 10 meters of event venue
        validateLocationProximity(latitude, longitude);
      },
      (error) => {
        setLocationError('Please enable location access to register');
        setLocationPermission(false);
        console.error(error);
      }
    );
  };

  const validateLocationProximity = (userLat, userLng) => {
    // Event venue coordinates (replace with actual coordinates)
    const venueLat = 40.7128;
    const venueLng = -74.006;
    const maxRadius = 10; // meters

    const distance = calculateDistance(userLat, userLng, venueLat, venueLng);

    if (distance > maxRadius) {
      setLocationError(
        `You are ${Math.round(distance)}m away from venue. Please come within 10m to register.`
      );
    } else {
      setLocationError('');
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!location) {
      setError('Location access is required to register');
      return;
    }

    if (locationError) {
      setError(locationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/register-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
        alert('Registration successful! Check your email for your unique ID.');
        navigate('/user-login');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
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
      paddingTop: '40px',
      paddingBottom: '40px',
    },
    card: {
      width: '100%',
      maxWidth: '420px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
      padding: '40px',
    },
    headerContainer: {
      textAlign: 'center',
      marginBottom: '40px',
    },
    iconContainer: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '70px',
      height: '70px',
      background: '#667eea',
      borderRadius: '50%',
      marginBottom: '20px',
      boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0 0 8px 0',
    },
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
      margin: '8px 0 0 0',
    },
    locationStatus: {
      marginBottom: '24px',
      padding: '16px',
      borderRadius: '12px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      border: `2px solid ${locationPermission ? '#10b981' : '#f59e0b'}`,
      background: locationPermission ? '#d1fae5' : '#fef3c7',
    },
    locationIcon: {
      fontSize: '20px',
      marginTop: '4px',
      flexShrink: 0,
      color: locationPermission ? '#10b981' : '#f59e0b',
    },
    locationText: {
      fontSize: '14px',
      fontWeight: '500',
      color: locationPermission ? '#065f46' : '#92400e',
      margin: '0',
    },
    accuracyText: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '6px',
      margin: '6px 0 0 0',
    },
    errorAlert: {
      marginBottom: '24px',
      padding: '16px',
      borderRadius: '12px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      background: '#fee2e2',
      border: '2px solid #ef4444',
    },
    errorIcon: {
      fontSize: '20px',
      marginTop: '4px',
      flexShrink: 0,
      color: '#ef4444',
    },
    errorText: {
      fontSize: '14px',
      color: '#991b1b',
      margin: '0',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px',
    },
    input: {
      padding: '12px 14px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'inherit',
      transition: 'all 0.3s ease',
      background: 'white',
    },
    button: {
      width: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '14px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      transition: 'all 0.3s ease',
      marginTop: '8px',
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    footer: {
      marginTop: '28px',
      textAlign: 'center',
    },
    footerText: {
      fontSize: '14px',
      color: '#6b7280',
      margin: '0',
    },
    link: {
      color: '#667eea',
      textDecoration: 'none',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'color 0.3s ease',
    },
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = '#667eea';
    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = '#e5e7eb';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.headerContainer}>
          <div style={styles.iconContainer}>
            <MapPin size={32} color="white" />
          </div>
          <h1 style={styles.title}>Register</h1>
          <p style={styles.subtitle}>Walking Interview System</p>
        </div>

        {/* Location Status */}
        <div style={styles.locationStatus}>
          <MapPin size={20} style={styles.locationIcon} />
          <div>
            <p style={styles.locationText}>
              {locationPermission
                ? '✓ Location access granted'
                : '⚠ Location access needed to register'}
            </p>
            {location && (
              <p style={styles.accuracyText}>
                Accuracy: ±{Math.round(location.accuracy)}m
              </p>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={20} style={styles.errorIcon} />
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                required
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="your@email.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="+1 (555) 000-0000"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !locationPermission}
            style={{
              ...styles.button,
              ...(loading || !locationPermission ? styles.buttonDisabled : {}),
            }}
            onMouseEnter={(e) => {
              if (!loading && locationPermission) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                Registering...
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{' '}
            <Link
              to="/user-login"
              style={styles.link}
              onMouseEnter={(e) => (e.target.style.color = '#764ba2')}
              onMouseLeave={(e) => (e.target.style.color = '#667eea')}
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
