import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast, Toaster } from "sonner";

// Capacitor imports
let Geolocation, App, LocalNotifications, BackgroundGeolocation;
let isCapacitor = false;

// Check if running in Capacitor
try {
  if (window.Capacitor) {
    isCapacitor = true;
    const capacitorGeolocation = require('@capacitor/geolocation');
    const capacitorApp = require('@capacitor/app');
    const capacitorNotifications = require('@capacitor/local-notifications');
    Geolocation = capacitorGeolocation.Geolocation;
    App = capacitorApp.App;
    LocalNotifications = capacitorNotifications.LocalNotifications;
    
    // Try to load background geolocation
    try {
      const bgGeo = require('@capacitor-community/background-geolocation');
      BackgroundGeolocation = bgGeo.BackgroundGeolocation;
      console.log('Background geolocation loaded');
    } catch (e) {
      console.log('Background geolocation not available');
    }
  }
} catch (e) {
  console.log('Not running in Capacitor');
}

// Get API URL
const API = process.env.REACT_APP_BACKEND_URL + "/api";

const MobileTrackingApp = () => {
  // States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [loginForm, setLoginForm] = useState({ code: "", phone: "" });
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [locationStatus, setLocationStatus] = useState({ isWithinRange: true, distance: 0 });
  const [settings, setSettings] = useState({ update_interval_seconds: 60 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  
  const intervalRef = useRef(null);
  const watchIdRef = useRef(null);

  // Initialize app
  useEffect(() => {
    // Check for saved login
    const savedEmployee = localStorage.getItem('tracking_employee');
    if (savedEmployee) {
      const emp = JSON.parse(savedEmployee);
      setEmployee(emp);
      setIsLoggedIn(true);
    }
    
    // Fetch settings
    fetchSettings();
    
    // Setup app state listener for Capacitor
    if (isCapacitor && App) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive && isTracking) {
          // App went to background, continue tracking
          setBackgroundTracking(true);
        } else if (isActive) {
          setBackgroundTracking(false);
        }
      });
    }
    
    return () => {
      if (isCapacitor && App) {
        App.removeAllListeners();
      }
    };
  }, [isTracking]);

  // Request permissions for Capacitor
  const requestPermissions = async () => {
    if (isCapacitor && Geolocation) {
      try {
        const permission = await Geolocation.requestPermissions();
        console.log('Permission:', permission);
        
        if (LocalNotifications) {
          await LocalNotifications.requestPermissions();
        }
        
        return permission.location === 'granted';
      } catch (e) {
        console.error('Permission error:', e);
        return false;
      }
    }
    return true;
  };

  // Fetch tracking settings
  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/tracking/settings`);
      setSettings(res.data);
    } catch (error) {
      console.log('Could not fetch settings');
    }
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.get(`${API}/tracking/employees/all`);
      const employees = res.data;
      
      const found = employees.find(emp => 
        (emp.employee_code === loginForm.code || emp.id === loginForm.code) &&
        emp.phone && emp.phone.includes(loginForm.phone.slice(-4))
      );
      
      if (found) {
        // Request permissions
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          setError('يرجى السماح بالوصول للموقع');
          setLoading(false);
          return;
        }
        
        setEmployee(found);
        setIsLoggedIn(true);
        localStorage.setItem('tracking_employee', JSON.stringify(found));
        toast.success('تم تسجيل الدخول بنجاح');
        
        // Auto start tracking
        setTimeout(() => startTracking(), 500);
      } else {
        setError('رقم الموظف أو الهاتف غير صحيح');
      }
    } catch (error) {
      setError('فشل في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    stopTracking();
    setEmployee(null);
    setIsLoggedIn(false);
    localStorage.removeItem('tracking_employee');
  };

  // Send location to server
  const sendLocation = useCallback(async (latitude, longitude, accuracy) => {
    if (!employee?.id) return;
    
    try {
      const res = await axios.post(`${API}/tracking/location`, {
        employee_id: employee.id,
        latitude,
        longitude,
        accuracy
      });
      
      setCurrentLocation({ lat: latitude, lng: longitude, accuracy });
      setLastUpdate(new Date());
      setLocationStatus({
        isWithinRange: res.data.is_within_range,
        distance: res.data.distance_from_work
      });
      setError(null);
      
      // Show notification for status change
      if (isCapacitor && LocalNotifications && backgroundTracking) {
        if (!res.data.is_within_range) {
          LocalNotifications.schedule({
            notifications: [{
              id: 1,
              title: 'تنبيه الموقع',
              body: 'أنت خارج نطاق العمل',
              sound: 'default'
            }]
          });
        }
      }
      
    } catch (error) {
      console.log('Could not send location');
    }
  }, [employee?.id, backgroundTracking]);

  // Get current position (works for both web and Capacitor)
  const getCurrentPosition = async () => {
    try {
      if (isCapacitor && Geolocation) {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000
        });
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      } else {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            }),
            reject,
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        });
      }
    } catch (error) {
      throw error;
    }
  };

  // Start tracking
  const startTracking = useCallback(async () => {
    setIsTracking(true);
    setError(null);
    
    try {
      // Get initial position
      const pos = await getCurrentPosition();
      await sendLocation(pos.latitude, pos.longitude, pos.accuracy);
      
      // Set up interval for continuous tracking
      const interval = (settings?.update_interval_seconds || 60) * 1000;
      intervalRef.current = setInterval(async () => {
        try {
          const pos = await getCurrentPosition();
          await sendLocation(pos.latitude, pos.longitude, pos.accuracy);
        } catch (e) {
          console.log('Location error:', e);
        }
      }, interval);
      
      // For Capacitor, also use watch position for better background tracking
      if (isCapacitor && Geolocation) {
        watchIdRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (position, err) => {
            if (position) {
              sendLocation(
                position.coords.latitude,
                position.coords.longitude,
                position.coords.accuracy
              );
            }
          }
        );
      }
      
      toast.success('تم تشغيل التتبع');
      
    } catch (error) {
      console.error('Start tracking error:', error);
      if (error.code === 1) {
        setError('يرجى السماح بالوصول للموقع من إعدادات الهاتف');
      } else {
        setError('فشل في تحديد الموقع');
      }
      setIsTracking(false);
    }
  }, [sendLocation, settings]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (isCapacitor && Geolocation && watchIdRef.current) {
      Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    
    setIsTracking(false);
    setBackgroundTracking(false);
    toast.info('تم إيقاف التتبع');
  }, []);

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #8B5A2B 0%, #6B4423 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl'
    },
    card: {
      background: 'white',
      borderRadius: '20px',
      padding: '24px',
      maxWidth: '400px',
      margin: '0 auto',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
    },
    logo: {
      width: '80px',
      height: '80px',
      margin: '0 auto 16px',
    },
    title: {
      textAlign: 'center',
      color: '#8B5A2B',
      marginBottom: '8px',
      fontSize: '22px',
      fontWeight: 'bold'
    },
    subtitle: {
      textAlign: 'center',
      color: '#666',
      marginBottom: '20px',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      marginBottom: '12px',
      fontSize: '16px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    button: {
      width: '100%',
      padding: '14px',
      background: '#8B5A2B',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '8px'
    },
    buttonOutline: {
      width: '100%',
      padding: '14px',
      background: 'white',
      color: '#8B5A2B',
      border: '2px solid #8B5A2B',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '8px'
    },
    buttonDanger: {
      width: '100%',
      padding: '14px',
      background: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '8px'
    },
    statusBox: {
      padding: '16px',
      borderRadius: '12px',
      marginBottom: '12px',
      textAlign: 'center'
    },
    statusConnected: {
      background: '#dcfce7',
      border: '2px solid #22c55e'
    },
    statusDisconnected: {
      background: '#fee2e2',
      border: '2px solid #ef4444'
    },
    infoBox: {
      background: '#f3f4f6',
      padding: '12px 16px',
      borderRadius: '10px',
      marginBottom: '10px'
    },
    error: {
      background: '#fee2e2',
      color: '#dc2626',
      padding: '12px',
      borderRadius: '10px',
      marginBottom: '12px',
      textAlign: 'center'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 'bold',
      marginBottom: '8px'
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div style={styles.container}>
        <Toaster position="top-center" richColors />
        <div style={styles.card}>
          <div style={styles.logo}>
            <img src="/almorooj-logo.png" alt="المروج" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={styles.title}>المروج للألبان</h1>
          <p style={styles.subtitle}>تطبيق تتبع الموقع للموظفين</p>
          
          {isCapacitor && (
            <div style={{ ...styles.badge, background: '#dcfce7', color: '#16a34a' }}>
              📱 تطبيق الموبايل
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="رقم الموظف"
              value={loginForm.code}
              onChange={(e) => setLoginForm({ ...loginForm, code: e.target.value })}
              style={styles.input}
              required
            />
            <input
              type="tel"
              placeholder="آخر 4 أرقام من رقم الهاتف"
              value={loginForm.phone}
              onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
              style={styles.input}
              maxLength={4}
              required
            />
            
            {error && <div style={styles.error}>{error}</div>}
            
            <button 
              type="submit" 
              style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>
          
          <p style={{ textAlign: 'center', color: '#999', fontSize: '11px', marginTop: '16px' }}>
            {isCapacitor 
              ? '✓ التتبع يعمل في الخلفية' 
              : '📱 للتتبع المستمر، ثبّت التطبيق'}
          </p>
        </div>
      </div>
    );
  }

  // Main Tracking Screen
  return (
    <div style={styles.container}>
      <Toaster position="top-center" richColors />
      <div style={styles.card}>
        <div style={styles.logo}>
          <img src="/almorooj-logo.png" alt="المروج" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h1 style={styles.title}>مرحباً {employee?.name?.split(' ')[0]}</h1>
        <p style={styles.subtitle}>{employee?.employee_code}</p>
        
        {backgroundTracking && (
          <div style={{ ...styles.badge, background: '#dbeafe', color: '#2563eb', display: 'block', textAlign: 'center' }}>
            🔄 التتبع يعمل في الخلفية
          </div>
        )}
        
        {/* Connection Status */}
        <div style={{
          ...styles.statusBox,
          ...(isTracking ? styles.statusConnected : styles.statusDisconnected)
        }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>
            {isTracking ? '🟢' : '🔴'}
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: isTracking ? '#16a34a' : '#dc2626' }}>
            {isTracking ? 'التتبع مُفعّل' : 'التتبع متوقف'}
          </div>
        </div>
        
        {/* Location Info */}
        {currentLocation && (
          <>
            <div style={styles.infoBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#666' }}>حالة النطاق:</span>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: locationStatus.isWithinRange ? '#16a34a' : '#dc2626'
                }}>
                  {locationStatus.isWithinRange ? '✅ داخل النطاق' : '⚠️ خارج النطاق'}
                </span>
              </div>
            </div>
            
            <div style={styles.infoBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#666' }}>المسافة:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {locationStatus.distance < 1000 
                    ? `${Math.round(locationStatus.distance)} متر`
                    : `${(locationStatus.distance / 1000).toFixed(1)} كم`}
                </span>
              </div>
            </div>
            
            <div style={styles.infoBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#666' }}>آخر تحديث:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {lastUpdate?.toLocaleTimeString('ar-SA')}
                </span>
              </div>
            </div>
          </>
        )}
        
        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}
        
        {/* Buttons */}
        {!isTracking ? (
          <button onClick={startTracking} style={styles.button}>
            ▶️ تشغيل التتبع
          </button>
        ) : (
          <button onClick={stopTracking} style={styles.buttonOutline}>
            ⏸️ إيقاف التتبع
          </button>
        )}
        
        <button onClick={handleLogout} style={styles.buttonDanger}>
          🚪 تسجيل الخروج
        </button>
        
        {/* Info */}
        <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', marginTop: '16px' }}>
          يتم تحديث الموقع كل {settings?.update_interval_seconds || 60} ثانية
          {isCapacitor && <><br/>✓ يعمل في الخلفية</>}
        </p>
      </div>
    </div>
  );
};

export default MobileTrackingApp;
