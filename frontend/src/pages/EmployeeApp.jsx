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
    setShowCamera(true);
    setError(null);
    
    // Wait for video element to be rendered
    setTimeout(async () => {
      try {
        const constraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.log('Play error:', e));
          };
        }
      } catch (err) {
        console.error('Camera error:', err);
        setShowCamera(false);
        if (err.name === 'NotAllowedError') {
          setError('يرجى السماح بالوصول للكاميرا من إعدادات المتصفح');
        } else if (err.name === 'NotFoundError') {
          setError('لم يتم العثور على كاميرا في جهازك');
        } else {
          setError('فشل في فتح الكاميرا: ' + err.message);
        }
      }
    }, 100);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas size to video size
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Draw video frame to canvas (flip horizontally for selfie)
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
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
    installBanner: {
      background: '#fef3c7',
      padding: '12px',
      borderRadius: '10px',
      marginBottom: '16px',
      textAlign: 'center'
    },
    cameraContainer: {
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '16px'
    },
    video: {
      width: '100%',
      borderRadius: '16px',
      transform: 'scaleX(-1)'
    },
    capturedImage: {
      width: '100%',
      borderRadius: '16px',
      transform: 'scaleX(-1)'
    },
    cameraOverlay: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '180px',
      height: '220px',
      border: '3px solid rgba(255,255,255,0.8)',
      borderRadius: '50%',
      pointerEvents: 'none',
      boxShadow: '0 0 0 2000px rgba(0,0,0,0.3)'
    },
    captureButton: {
      width: '70px',
      height: '70px',
      borderRadius: '50%',
      background: 'white',
      border: '4px solid #8B5A2B',
      cursor: 'pointer',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px'
    },
    loadingCamera: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '300px',
      background: '#1a1a1a',
      borderRadius: '16px',
      color: 'white'
    }
  };

  // Face Verification Screen
  if (showCamera || capturedPhoto) {
    return (
      <div style={styles.container}>
        <Toaster position="top-center" richColors />
        <div style={styles.card}>
          <h1 style={{...styles.title, fontSize: '20px'}}>📸 التحقق من الهوية</h1>
          <p style={styles.subtitle}>
            {pendingEmployee?.name}<br/>
            <span style={{ fontSize: '12px', color: '#999' }}>{pendingEmployee?.employee_code}</span>
          </p>
          
          {showCamera && !capturedPhoto && (
            <>
              <div style={styles.cameraContainer}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{
                    width: '100%',
                    height: '300px',
                    objectFit: 'cover',
                    borderRadius: '16px',
                    transform: 'scaleX(-1)',
                    background: '#1a1a1a'
                  }}
                />
                <div style={styles.cameraOverlay}></div>
              </div>
              <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', margin: '12px 0' }}>
                ضع وجهك داخل الإطار واضغط الزر
              </p>
              <button 
                onClick={capturePhoto}
                style={styles.captureButton}
                title="التقاط الصورة"
              >
                📷
              </button>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </>
          )}
          
          {capturedPhoto && (
            <>
              <div style={styles.cameraContainer}>
                <img 
                  src={capturedPhoto} 
                  alt="صورة التحقق" 
                  style={styles.capturedImage}
                />
              </div>
              <p style={{ textAlign: 'center', color: '#8B5A2B', fontSize: '14px', marginBottom: '16px' }}>
                ✓ تم التقاط الصورة بنجاح
              </p>
              <button 
                onClick={confirmPhotoAndLogin}
                style={styles.button}
              >
                ✓ تأكيد والدخول
              </button>
              <button 
                onClick={retakePhoto}
                style={styles.buttonOutline}
              >
                🔄 إعادة التقاط
              </button>
            </>
          )}
          
          <button 
            onClick={() => {
              stopCamera();
              setCapturedPhoto(null);
              setPendingEmployee(null);
            }}
            style={{ ...styles.buttonDanger, marginTop: '16px' }}
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  }

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
          
          <p style={{ textAlign: 'center', color: '#999', fontSize: '11px', marginTop: '16px' }}>
            📸 سيُطلب منك التقاط صورة للتحقق
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
