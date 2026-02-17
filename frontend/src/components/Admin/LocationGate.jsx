import React, { useState, useEffect } from "react";
import { Zap, MapPin, Check, X, Loader2 } from "lucide-react";
import {
  getUserLocation,
  isWithinRadius,
  getGeolocationErrorMessage,
} from "../../utils/geolocation";

const QUIZ_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
const LOCATION_API_BASE = QUIZ_BACKEND_URL
  ? `${QUIZ_BACKEND_URL}/api`
  : import.meta.env.VITE_API_URL || "/api";

// Get token from URL
const getTokenFromURL = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("token");
};

// Fetch location from backend using token
const fetchLocationFromToken = async (token) => {
  try {
    const response = await fetch(
      `${LOCATION_API_BASE}/location/validate?token=${token}`,
    );
    const data = await response.json();

    if (data.success) {
      return {
        lat: data.lat,
        lon: data.lon,
        maxRadius: data.maxRadius || 200,
        isValid: true,
        bypassLocation: data.bypassLocation || false, // Emergency bypass flag
      };
    }
    return {
      lat: null,
      lon: null,
      maxRadius: 200,
      isValid: false,
      bypassLocation: false,
      error: data.message,
    };
  } catch (error) {
    console.error("Error fetching location:", error);
    return {
      lat: null,
      lon: null,
      maxRadius: 200,
      isValid: false,
      bypassLocation: false,
      error: "Server connection failed",
    };
  }
};

export default function LocationGate({ children }) {
  const [status, setStatus] = useState("checking"); // 'checking', 'granted', 'denied', 'error', 'no-qr'
  const [error, setError] = useState("");
  const [distance, setDistance] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [allowedLocation, setAllowedLocation] = useState(null);
  const [permissionState, setPermissionState] = useState("unknown"); // 'unknown' | 'granted' | 'prompt' | 'denied'
  const [permissionChecked, setPermissionChecked] = useState(false);

  const checkLocation = async () => {
    const token = getTokenFromURL();

    // Check if token is provided in URL
    if (!token) {
      setStatus("no-qr");
      setError(
        "No access token found. Please scan the QR code at the examination center.",
      );
      return;
    }

    setStatus("checking");
    setError("");

    // Fetch location from backend
    const locationData = await fetchLocationFromToken(token);

    if (!locationData.isValid) {
      setStatus("no-qr");
      setError(
        locationData.error ||
          "Invalid or expired token. Please scan a valid QR code.",
      );
      return;
    }

    setAllowedLocation(locationData);

    // TPAccess bypass - skip location check entirely
    if (locationData.bypassLocation) {
      console.log(
        "🔓 Emergency bypass token detected - skipping location check",
      );
      setStatus("granted");
      return;
    }

    try {
      const location = await getUserLocation();
      setUserCoords({
        lat: location.latitude,
        lon: location.longitude,
      });

      const result = isWithinRadius(
        location.latitude,
        location.longitude,
        locationData.lat,
        locationData.lon,
        locationData.maxRadius,
      );

      setDistance(result.distance);

      if (result.isWithinRadius) {
        setStatus("granted");
      } else {
        setStatus("denied");
        setError(
          `You are ${result.distance} meters away from the authorized location. Access is only allowed within ${locationData.maxRadius} meters.`,
        );
      }
    } catch (err) {
      setStatus("error");
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
          const p = await navigator.permissions.query({ name: "geolocation" });
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
      setPermissionState("granted");
    } catch (err) {
      setPermissionState("denied");
      setError(getGeolocationErrorMessage(err));
    }
  };

  // Add spinner animation
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  // If access is granted, render children
  if (status === "granted") {
    return children;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-10 py-12 text-center shadow-sm">
        {/* CHECKING */}
        {status === "checking" && (
          <>
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              {/* Outer pulse */}
              <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" />

              {/* Inner subtle pulse */}
              <div className="absolute inset-3 rounded-full bg-blue-50 animate-pulse" />

              {/* Icon container */}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <h2 className="mt-8 text-xl font-semibold text-gray-900">
              Verifying Your Location
            </h2>

            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Please wait while we confirm you are within the designated
              assessment zone.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Scanning GPS coordinates...
            </div>
          </>
        )}

        {/* DENIED */}
        {status === "denied" && (
          <>
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-100 opacity-40" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <X className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <h2 className="mt-8 text-xl font-semibold text-gray-900">
              Access Denied
            </h2>

            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              You are not within the designated assessment zone.
            </p>

            {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

            <button
              onClick={checkLocation}
              className="mt-8 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition duration-200 hover:bg-gray-50"
            >
              Retry Verification
            </button>
          </>
        )}

        {/* ERROR */}
        {status === "error" && (
          <>
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-yellow-100 opacity-40" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>

            <h2 className="mt-8 text-xl font-semibold text-gray-900">
              Location Error
            </h2>

            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Unable to verify your location.
            </p>

            {error && (
              <div className="mt-4 text-sm text-yellow-600">{error}</div>
            )}

            <button
              onClick={checkLocation}
              className="mt-8 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition duration-200 hover:bg-gray-50"
            >
              Try Again
            </button>
          </>
        )}

        {/* NO QR */}
        {status === "no-qr" && (
          <>
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-purple-100 opacity-40" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <h2 className="mt-8 text-xl font-semibold text-gray-900">
              QR Code Required
            </h2>

            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Please scan the QR code at the examination center to access this
              system.
            </p>

            {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

            <button
              onClick={requestLocationPermission}
              className="mt-8 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition duration-200 hover:bg-gray-50"
            >
              Enable Location
            </button>
          </>
        )}
      </div>
    </div>
  );
}
