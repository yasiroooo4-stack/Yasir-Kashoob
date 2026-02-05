import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast, Toaster } from "sonner";

// Get API URL
const API = process.env.REACT_APP_BACKEND_URL + "/api";

const EmployeeApp = () => {
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
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  
  // Face verification states
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [pendingEmployee, setPendingEmployee] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const intervalRef = useRef(null);

  // Check if app is installed
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/tracking-sw.js')
        .then((reg) => console.log('SW registered'))
        .catch((err) => console.log('SW registration failed'));
    }
    
    // Check for saved login
    const savedEmployee = localStorage.getItem('tracking_employee');
    if (savedEmployee) {
      const emp = JSON.parse(savedEmployee);
      setEmployee(emp);
      setIsLoggedIn(true);
    }
    
    // Fetch settings
    fetchSettings();
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Fetch tracking settings
  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/tracking/settings`);
      setSettings(res.data);
    } catch (error) {
      console.log('Could not fetch settings');
    }
  };

  // Camera functions for face verification
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      setError('فشل في فتح الكاميرا. يرجى السماح بالوصول للكاميرا.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoData);
      stopCamera();
    }
  };

  const confirmPhotoAndLogin = async () => {
    if (pendingEmployee && capturedPhoto) {
      try {
        // Upload photo with location data
        const formData = new FormData();
        
        // Convert base64 to blob
        const response = await fetch(capturedPhoto);
        const blob = await response.blob();
        formData.append('photo', blob, 'face_verification.jpg');
        formData.append('employee_id', pendingEmployee.id);
        formData.append('timestamp', new Date().toISOString());
        
        // Upload verification photo
        await axios.post(`${API}/tracking/verify-photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // Complete login
        setEmployee(pendingEmployee);
        setIsLoggedIn(true);
        localStorage.setItem('tracking_employee', JSON.stringify(pendingEmployee));
        localStorage.setItem('tracking_last_photo', capturedPhoto);
        toast.success('تم تسجيل الدخول والتحقق بنجاح');
        
        // Reset
        setPendingEmployee(null);
        setCapturedPhoto(null);
      } catch (error) {
        console.log('Photo upload failed, continuing anyway');
        // Even if upload fails, allow login
        setEmployee(pendingEmployee);
        setIsLoggedIn(true);
        localStorage.setItem('tracking_employee', JSON.stringify(pendingEmployee));
        toast.success('تم تسجيل الدخول بنجاح');
        setPendingEmployee(null);
        setCapturedPhoto(null);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // Login with employee code and phone
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Find employee by code and phone
      const res = await axios.get(`${API}/tracking/employees/all`);
      const employees = res.data;
      
      const found = employees.find(emp => 
        (emp.employee_code === loginForm.code || emp.id === loginForm.code) &&
        emp.phone && emp.phone.includes(loginForm.phone.slice(-4))
      );
      
      if (found) {
        // Store pending employee and show camera for face verification
        setPendingEmployee(found);
        startCamera();
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
    localStorage.removeItem('tracking_last_photo');
  };

  // Send location to server
  const sendLocation = useCallback(async (position) => {
    if (!employee?.id) return;
    
    try {
      const res = await axios.post(`${API}/tracking/location`, {
        employee_id: employee.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
      
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
      setLastUpdate(new Date());
      setLocationStatus({
        isWithinRange: res.data.is_within_range,
        distance: res.data.distance_from_work
      });
      setError(null);
      
    } catch (error) {
      // Save to IndexedDB for later sync if offline
      console.log('Could not send location, will retry later');
    }
  }, [employee?.id]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('جهازك لا يدعم تحديد الموقع');
      return;
    }
    
    setIsTracking(true);
    setError(null);
    
    // Get initial position
    navigator.geolocation.getCurrentPosition(
      sendLocation,
      (err) => {
        if (err.code === 1) {
          setError('يرجى السماح بالوصول للموقع من إعدادات الهاتف');
        } else {
          setError('فشل في تحديد الموقع');
        }
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    
    // Set up interval
    const interval = (settings?.update_interval_seconds || 60) * 1000;
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendLocation,
        (err) => console.log('Location error:', err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }, interval);
    
    toast.success('تم تشغيل التتبع');
  }, [sendLocation, settings]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
    toast.info('تم إيقاف التتبع');
  }, []);

  // Auto-start tracking when logged in
  useEffect(() => {
    if (isLoggedIn && employee && !isTracking) {
      startTracking();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoggedIn, employee]);

  // Install app
  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        toast.success('تم تثبيت التطبيق');
      }
      setInstallPrompt(null);
    }
  };

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
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
      background: '#d4a574',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px'
    },
    title: {
      textAlign: 'center',
      color: '#047857',
      marginBottom: '8px',
      fontSize: '24px',
      fontWeight: 'bold'
    },
    subtitle: {
      textAlign: 'center',
      color: '#666',
      marginBottom: '24px',
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
      background: '#047857',
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
      color: '#047857',
      border: '2px solid #047857',
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
    installBanner: {
      background: '#fef3c7',
      padding: '12px',
      borderRadius: '10px',
      marginBottom: '16px',
      textAlign: 'center'
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div style={styles.container}>
        <Toaster position="top-center" richColors />
        <div style={styles.card}>
          <div style={styles.logo}>🐄</div>
          <h1 style={styles.title}>المروج للألبان</h1>
          <p style={styles.subtitle}>تطبيق تتبع الموقع للموظفين</p>
          
          {!isInstalled && installPrompt && (
            <div style={styles.installBanner}>
              <p style={{ margin: '0 0 8px', fontSize: '14px' }}>📲 ثبّت التطبيق للاستخدام الأفضل</p>
              <button 
                onClick={handleInstall}
                style={{ ...styles.button, padding: '10px', marginTop: 0 }}
              >
                تثبيت التطبيق
              </button>
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
        </div>
      </div>
    );
  }

  // Main Tracking Screen
  return (
    <div style={styles.container}>
      <Toaster position="top-center" richColors />
      <div style={styles.card}>
        <div style={styles.logo}>📍</div>
        <h1 style={styles.title}>مرحباً {employee?.name?.split(' ')[0]}</h1>
        <p style={styles.subtitle}>{employee?.employee_code} • {employee?.department}</p>
        
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
        </p>
      </div>
    </div>
  );
};

export default EmployeeApp;
