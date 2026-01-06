import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Light Brown Theme Colors
const COLORS = {
  primary: '#8B7355',      // Light brown
  primaryDark: '#6B5344',  // Darker brown
  primaryLight: '#A89078', // Lighter brown
  accent: '#C4A77D',       // Gold/tan accent
  background: '#F5F0EB',   // Cream background
  card: '#FFFFFF',
  text: '#4A3728',         // Dark brown text
  textLight: '#8B7355',
  success: '#6B8E23',      // Olive green
  danger: '#CD5C5C',       // Indian red
  warning: '#DAA520',      // Goldenrod
};

// Message Types
const MESSAGE_TYPES = [
  { id: 'general', name: 'استفسار عام', icon: '❓' },
  { id: 'complaint', name: 'شكوى', icon: '⚠️' },
  { id: 'inquiry', name: 'استفسار مالي', icon: '💰' },
  { id: 'increase_quantity', name: 'طلب زيادة كمية', icon: '📈' },
];

const QUANTITIES = [25, 50, 100, 200, 500, 1000];

const SupplierApp = () => {
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  
  // UI State
  const [currentScreen, setCurrentScreen] = useState('login');
  const [loading, setLoading] = useState(false);
  
  // Login Form
  const [supplierCode, setSupplierCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP Recovery
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [newPasswordRecovery, setNewPasswordRecovery] = useState('');
  
  // Dashboard Data
  const [dashboardData, setDashboardData] = useState(null);
  const [supplies, setSupplies] = useState([]);
  
  // Feed Types from Database
  const [feedTypes, setFeedTypes] = useState([]);
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(null);
  
  // Message
  const [messageType, setMessageType] = useState(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  
  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check stored auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('supplier_token');
    const storedUser = localStorage.getItem('supplier_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
      setCurrentScreen('dashboard');
    }
  }, []);

  // Fetch feed types from database
  const fetchFeedTypes = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/feed-types`);
      if (response.data && response.data.length > 0) {
        setFeedTypes(response.data.map(f => ({
          id: f.id,
          name: f.name,
          price: f.price_per_unit || 0,
          company: f.company_name,
          icon: '🌾'
        })));
      }
    } catch (error) {
      console.log('Feed types error:', error);
      // Fallback to default types
      setFeedTypes([
        { id: 'barley', name: 'شعير', price: 85, icon: '🌾' },
        { id: 'wheat_bran', name: 'نخالة قمح', price: 70, icon: '🌿' },
        { id: 'corn', name: 'ذرة', price: 95, icon: '🌽' },
        { id: 'alfalfa', name: 'برسيم', price: 120, icon: '🌱' },
        { id: 'mixed', name: 'علف مخلوط', price: 100, icon: '📦' },
      ]);
    }
  }, []);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!user || !token) return;
    try {
      const response = await axios.get(`${API}/api/supplier-portal/${user.id}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.log('Dashboard error:', error);
    }
  }, [user, token]);

  // Fetch supplies
  const fetchSupplies = useCallback(async () => {
    if (!user || !token) return;
    try {
      const response = await axios.get(`${API}/api/supplier-portal/${user.id}/supplies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSupplies(response.data || []);
    } catch (error) {
      console.log('Supplies error:', error);
    }
  }, [user, token]);

  useEffect(() => {
    fetchFeedTypes();
  }, [fetchFeedTypes]);

  useEffect(() => {
    if (isLoggedIn && currentScreen === 'dashboard') {
      fetchDashboard();
      fetchSupplies();
    }
  }, [isLoggedIn, currentScreen, fetchDashboard, fetchSupplies]);

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supplierCode.trim() || !password.trim()) {
      toast.error('يرجى إدخال كود المورد وكلمة المرور');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/supplier-portal/login`, {
        supplier_code: supplierCode.trim(),
        password: password
      });
      
      const { access_token, supplier } = response.data;
      localStorage.setItem('supplier_token', access_token);
      localStorage.setItem('supplier_user', JSON.stringify(supplier));
      
      setToken(access_token);
      setUser(supplier);
      setIsLoggedIn(true);
      setCurrentScreen('dashboard');
      toast.success(`مرحباً ${supplier.name}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (!recoveryPhone.trim()) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/api/supplier-portal/send-otp`, {
        phone: recoveryPhone.trim()
      });
      setOtpSent(true);
      toast.success('تم إرسال رمز التحقق إلى هاتفك');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and Reset Password
  const handleVerifyOTP = async () => {
    if (!otpCode.trim() || !newPasswordRecovery.trim()) {
      toast.error('يرجى إدخال رمز التحقق وكلمة المرور الجديدة');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/api/supplier-portal/verify-otp-reset`, {
        phone: recoveryPhone.trim(),
        otp: otpCode.trim(),
        new_password: newPasswordRecovery
      });
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentScreen('login');
      setRecoveryPhone('');
      setOtpCode('');
      setOtpSent(false);
      setNewPasswordRecovery('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('supplier_token');
    localStorage.removeItem('supplier_user');
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setCurrentScreen('login');
    setSupplierCode('');
    setPassword('');
  };

  // Submit Feed Request
  const handleSubmitFeedRequest = async () => {
    if (!selectedFeed || !selectedQuantity) {
      toast.error('يرجى اختيار نوع العلف والكمية');
      return;
    }
    
    const amount = selectedFeed.price * selectedQuantity;
    if (amount > (user?.balance || 0)) {
      toast.error('رصيدك غير كافي لهذا الطلب');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/api/supplier-portal/feed-request`, {
        supplier_id: user.id,
        supplier_name: user.name,
        supplier_code: user.code,
        feed_type: selectedFeed.id,
        feed_name: selectedFeed.name,
        quantity: selectedQuantity,
        amount_to_deduct: amount
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('تم إرسال طلبك بنجاح');
      setSelectedFeed(null);
      setSelectedQuantity(null);
      setCurrentScreen('dashboard');
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!messageType || !messageSubject.trim() || !messageText.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/api/supplier-portal/messages`, {
        supplier_id: user.id,
        supplier_name: user.name,
        supplier_code: user.code,
        message_type: messageType.id,
        subject: messageSubject.trim(),
        message: messageText.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('تم إرسال رسالتك بنجاح');
      setMessageType(null);
      setMessageSubject('');
      setMessageText('');
      setCurrentScreen('dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(
        `${API}/api/supplier-portal/change-password?supplier_code=${user.code}&current_password=${currentPassword}&new_password=${newPassword}`
      );
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentScreen('dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  // Format helpers
  const formatCurrency = (amount) => `${(amount || 0).toLocaleString()} ريال`;
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // ============ SCREENS ============

  // Login Screen
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img 
            src="/logo-marooj.png" 
            alt="المروج للألبان" 
            className="w-32 h-32 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold" style={{ color: COLORS.primary }}>المروج للألبان</h1>
          <p className="text-gray-500">بوابة الموردين</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-right" style={{ color: COLORS.text }}>كود المورد</label>
            <input
              type="text"
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-right text-lg transition"
              style={{ borderColor: COLORS.primaryLight, focus: { borderColor: COLORS.primary } }}
              placeholder="أدخل كود المورد"
              inputMode="numeric"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-right" style={{ color: COLORS.text }}>كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-right text-lg transition"
                style={{ borderColor: COLORS.primaryLight }}
                placeholder="أدخل كلمة المرور"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: COLORS.textLight }}>
              كلمة المرور الافتراضية: <strong>0000</strong>
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: COLORS.primary }}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>تسجيل الدخول</>
            )}
          </button>
        </form>
        
        {/* Password Recovery Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentScreen('recovery')}
            className="text-sm underline"
            style={{ color: COLORS.primary }}
          >
            نسيت كلمة المرور؟ استرجاع عبر رقم الهاتف
          </button>
        </div>
        
        <p className="text-center text-sm mt-8" style={{ color: COLORS.textLight }}>© 2026 المروج للألبان</p>
      </div>
    </div>
  );

  // Password Recovery Screen
  const renderRecovery = () => (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img 
            src="/logo-marooj.png" 
            alt="المروج للألبان" 
            className="w-24 h-24 mx-auto mb-4 object-contain"
          />
          <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>استرجاع كلمة المرور</h1>
          <p className="text-gray-500 text-sm mt-2">أدخل رقم هاتفك لاستلام رمز التحقق</p>
        </div>
        
        {!otpSent ? (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-right" style={{ color: COLORS.text }}>رقم الهاتف</label>
              <input
                type="tel"
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-right text-lg"
                style={{ borderColor: COLORS.primaryLight }}
                placeholder="أدخل رقم الهاتف المسجل"
                inputMode="tel"
              />
            </div>
            
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-bold text-lg transition disabled:opacity-50"
              style={{ backgroundColor: COLORS.primary }}
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-right" style={{ color: COLORS.text }}>رمز التحقق (OTP)</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-center text-2xl tracking-widest"
                style={{ borderColor: COLORS.primaryLight }}
                placeholder="- - - -"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-right" style={{ color: COLORS.text }}>كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPasswordRecovery}
                onChange={(e) => setNewPasswordRecovery(e.target.value)}
                className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-right text-lg"
                style={{ borderColor: COLORS.primaryLight }}
                placeholder="أدخل كلمة المرور الجديدة"
              />
            </div>
            
            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-bold text-lg transition disabled:opacity-50"
              style={{ backgroundColor: COLORS.success }}
            >
              {loading ? 'جاري التحقق...' : 'تأكيد وتغيير كلمة المرور'}
            </button>
            
            <button
              onClick={() => { setOtpSent(false); setOtpCode(''); }}
              className="w-full py-2 text-sm"
              style={{ color: COLORS.primary }}
            >
              إعادة إرسال الرمز
            </button>
          </div>
        )}
        
        <button
          onClick={() => { setCurrentScreen('login'); setOtpSent(false); setRecoveryPhone(''); setOtpCode(''); }}
          className="w-full mt-4 py-2 text-sm"
          style={{ color: COLORS.textLight }}
        >
          ← العودة لتسجيل الدخول
        </button>
      </div>
    </div>
  );

  // Dashboard Screen
  const renderDashboard = () => (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* Header */}
      <div className="text-white p-6 pb-20 rounded-b-3xl" style={{ backgroundColor: COLORS.primary }}>
        <div className="flex justify-between items-start">
          <button onClick={handleLogout} className="bg-white/20 px-4 py-2 rounded-full text-sm">
            خروج
          </button>
          <div className="text-right flex items-center gap-3">
            <div>
              <p className="text-white/80 text-sm">مرحباً</p>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-white/70 text-sm">كود: {user?.code}</p>
            </div>
            <img src="/logo-marooj.png" alt="Logo" className="w-12 h-12 rounded-full bg-white p-1" />
          </div>
        </div>
      </div>
      
      {/* Balance Card */}
      <div className="bg-white rounded-2xl shadow-lg mx-4 -mt-12 p-6 mb-6">
        <p className="text-center text-sm" style={{ color: COLORS.textLight }}>الرصيد الحالي</p>
        <p className="text-4xl font-bold text-center my-2" style={{ color: COLORS.success }}>
          {formatCurrency(dashboardData?.balance || user?.balance)}
        </p>
        <div className="flex justify-around mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: COLORS.text }}>
              {(dashboardData?.total_supplied || user?.total_supplied || 0).toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: COLORS.textLight }}>إجمالي التوريد (لتر)</p>
          </div>
          <div className="w-px" style={{ backgroundColor: COLORS.primaryLight }}></div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: COLORS.text }}>{dashboardData?.supplies_count || supplies.length}</p>
            <p className="text-xs" style={{ color: COLORS.textLight }}>عدد التوريدات</p>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h3 className="text-lg font-bold mb-4 text-right" style={{ color: COLORS.text }}>الخدمات</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setCurrentScreen('feed-request')}
            className="text-white p-5 rounded-2xl text-center shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: COLORS.success }}
          >
            <span className="text-3xl block mb-2">🌾</span>
            <span className="font-bold">طلب أعلاف</span>
          </button>
          <button
            onClick={() => setCurrentScreen('supplies')}
            className="text-white p-5 rounded-2xl text-center shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: COLORS.primary }}
          >
            <span className="text-3xl block mb-2">📊</span>
            <span className="font-bold">سجل التوريدات</span>
          </button>
          <button
            onClick={() => setCurrentScreen('message')}
            className="text-white p-5 rounded-2xl text-center shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: COLORS.warning }}
          >
            <span className="text-3xl block mb-2">💬</span>
            <span className="font-bold">إرسال رسالة</span>
          </button>
          <button
            onClick={() => setCurrentScreen('settings')}
            className="text-white p-5 rounded-2xl text-center shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: COLORS.primaryDark }}
          >
            <span className="text-3xl block mb-2">⚙️</span>
            <span className="font-bold">الإعدادات</span>
          </button>
        </div>
      </div>
      
      {/* Recent Supplies */}
      <div className="px-4 pb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentScreen('supplies')} className="text-sm" style={{ color: COLORS.primary }}>
            عرض الكل
          </button>
          <h3 className="text-lg font-bold" style={{ color: COLORS.text }}>آخر التوريدات</h3>
        </div>
        {supplies.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center" style={{ color: COLORS.textLight }}>
            لا توجد توريدات حديثة
          </div>
        ) : (
          <div className="space-y-3">
            {supplies.slice(0, 5).map((supply, index) => (
              <div key={supply.id || index} className="bg-white rounded-xl p-4 flex justify-between items-center shadow">
                <div className="text-left">
                  <p className="font-bold" style={{ color: COLORS.text }}>{supply.quantity?.toLocaleString()} لتر</p>
                  <p className="text-sm" style={{ color: COLORS.success }}>{formatCurrency(supply.total_price)}</p>
                </div>
                <div className="text-right">
                  <p style={{ color: COLORS.text }}>{formatDate(supply.date)}</p>
                  <p className="text-sm" style={{ color: COLORS.textLight }}>{supply.milk_type === 'cow' ? '🐄 بقري' : '🐪 إبل'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Center Info */}
      <div className="text-center pb-8 text-sm" style={{ color: COLORS.textLight }}>
        المركز: {user?.center_name || '-'}
      </div>
    </div>
  );

  // Feed Request Screen
  const renderFeedRequest = () => (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* Header */}
      <div className="text-white p-4 flex items-center justify-between" style={{ backgroundColor: COLORS.primary }}>
        <div></div>
        <h1 className="text-lg font-bold">طلب أعلاف</h1>
        <button onClick={() => setCurrentScreen('dashboard')} className="text-2xl">←</button>
      </div>
      
      {/* Balance */}
      <div className="text-white text-center p-4 mx-4 mt-4 rounded-xl" style={{ backgroundColor: COLORS.success }}>
        <p className="text-sm opacity-80">رصيدك الحالي</p>
        <p className="text-2xl font-bold">{formatCurrency(user?.balance)}</p>
      </div>
      
      {/* Feed Types from Database */}
      <div className="p-4">
        <h3 className="text-lg font-bold mb-4 text-right" style={{ color: COLORS.text }}>اختر نوع العلف</h3>
        <div className="grid grid-cols-2 gap-3">
          {feedTypes.map((feed) => (
            <button
              key={feed.id}
              onClick={() => setSelectedFeed(feed)}
              className="p-4 rounded-xl text-center border-2 transition"
              style={{
                borderColor: selectedFeed?.id === feed.id ? COLORS.primary : '#e5e5e5',
                backgroundColor: selectedFeed?.id === feed.id ? `${COLORS.primary}15` : 'white'
              }}
            >
              <span className="text-3xl block mb-2">{feed.icon}</span>
              <p className="font-bold" style={{ color: COLORS.text }}>{feed.name}</p>
              <p className="text-sm" style={{ color: COLORS.success }}>{feed.price} ريال/كجم</p>
              {feed.company && (
                <p className="text-xs mt-1" style={{ color: COLORS.textLight }}>{feed.company}</p>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Quantities */}
      <div className="p-4">
        <h3 className="text-lg font-bold mb-4 text-right" style={{ color: COLORS.text }}>اختر الكمية (كجم)</h3>
        <div className="grid grid-cols-3 gap-3">
          {QUANTITIES.map((qty) => (
            <button
              key={qty}
              onClick={() => setSelectedQuantity(qty)}
              className="p-4 rounded-xl font-bold text-lg transition"
              style={{
                backgroundColor: selectedQuantity === qty ? COLORS.primary : 'white',
                color: selectedQuantity === qty ? 'white' : COLORS.text,
                border: selectedQuantity === qty ? 'none' : '1px solid #e5e5e5'
              }}
            >
              {qty}
            </button>
          ))}
        </div>
      </div>
      
      {/* Summary */}
      {selectedFeed && selectedQuantity && (
        <div className="bg-white mx-4 p-4 rounded-xl shadow">
          <h4 className="font-bold mb-3 text-right border-b pb-2" style={{ color: COLORS.text }}>ملخص الطلب</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-bold">{selectedFeed.name}</span>
              <span style={{ color: COLORS.textLight }}>نوع العلف:</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">{selectedQuantity} كجم</span>
              <span style={{ color: COLORS.textLight }}>الكمية:</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-bold text-xl" style={{ color: COLORS.success }}>
                {formatCurrency(selectedFeed.price * selectedQuantity)}
              </span>
              <span className="font-bold" style={{ color: COLORS.text }}>الإجمالي:</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Submit Button */}
      <div className="p-4">
        <button
          onClick={handleSubmitFeedRequest}
          disabled={!selectedFeed || !selectedQuantity || loading}
          className="w-full text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: COLORS.primary }}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'إرسال الطلب'
          )}
        </button>
        <p className="text-center text-xs mt-3" style={{ color: COLORS.warning }}>
          ⚠️ سيتم خصم المبلغ من رصيدك بعد موافقة الإدارة
        </p>
      </div>
    </div>
  );

  // Supplies Screen
  const renderSupplies = () => (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* Header */}
      <div className="text-white p-4 flex items-center justify-between" style={{ backgroundColor: COLORS.primary }}>
        <div></div>
        <h1 className="text-lg font-bold">سجل التوريدات</h1>
        <button onClick={() => setCurrentScreen('dashboard')} className="text-2xl">←</button>
      </div>
      
      {/* Summary */}
      <div className="text-white flex" style={{ backgroundColor: COLORS.primary }}>
        <div className="flex-1 text-center py-4 border-l border-white/20">
          <p className="text-2xl font-bold">{supplies.length}</p>
          <p className="text-xs opacity-80">عدد التوريدات</p>
        </div>
        <div className="flex-1 text-center py-4">
          <p className="text-2xl font-bold">
            {supplies.reduce((sum, s) => sum + (s.quantity || 0), 0).toLocaleString()}
          </p>
          <p className="text-xs opacity-80">إجمالي (لتر)</p>
        </div>
      </div>
      
      {/* List */}
      <div className="p-4 space-y-3">
        {supplies.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <span className="text-5xl block mb-4">📭</span>
            <p style={{ color: COLORS.textLight }}>لا توجد توريدات</p>
          </div>
        ) : (
          supplies.map((supply, index) => (
            <div key={supply.id || index} className="bg-white rounded-xl overflow-hidden shadow">
              <div className="flex justify-between items-center p-3 border-b" style={{ backgroundColor: COLORS.background }}>
                <span className="text-sm" style={{ color: COLORS.text }}>
                  {supply.milk_type === 'cow' ? '🐄 بقري' : '🐪 إبل'}
                </span>
                <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${COLORS.primary}20`, color: COLORS.primary }}>
                  {formatDate(supply.date)}
                </span>
              </div>
              <div className="p-4 flex justify-around text-center">
                <div>
                  <p className="text-xl font-bold" style={{ color: COLORS.text }}>{supply.quantity?.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: COLORS.textLight }}>الكمية (لتر)</p>
                </div>
                <div className="w-px" style={{ backgroundColor: COLORS.primaryLight }}></div>
                <div>
                  <p className="text-xl font-bold" style={{ color: COLORS.text }}>{supply.fat_percentage || '-'}%</p>
                  <p className="text-xs" style={{ color: COLORS.textLight }}>نسبة الدسم</p>
                </div>
                <div className="w-px" style={{ backgroundColor: COLORS.primaryLight }}></div>
                <div>
                  <p className="text-xl font-bold" style={{ color: COLORS.text }}>{supply.price_per_liter || '-'}</p>
                  <p className="text-xs" style={{ color: COLORS.textLight }}>سعر اللتر</p>
                </div>
              </div>
              <div className="p-3 flex justify-between items-center" style={{ backgroundColor: COLORS.background }}>
                <p className="font-bold text-lg" style={{ color: COLORS.success }}>{formatCurrency(supply.total_price)}</p>
                <p className="text-sm" style={{ color: COLORS.textLight }}>الإجمالي:</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Message Screen
  const renderMessage = () => (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* Header */}
      <div className="text-white p-4 flex items-center justify-between" style={{ backgroundColor: COLORS.primary }}>
        <div></div>
        <h1 className="text-lg font-bold">إرسال رسالة</h1>
        <button onClick={() => setCurrentScreen('dashboard')} className="text-2xl">←</button>
      </div>
      
      {/* Message Type */}
      <div className="p-4">
        <h3 className="text-lg font-bold mb-4 text-right" style={{ color: COLORS.text }}>نوع الرسالة</h3>
        <div className="grid grid-cols-2 gap-3">
          {MESSAGE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setMessageType(type)}
              className="p-4 rounded-xl text-center border-2 transition"
              style={{
                borderColor: messageType?.id === type.id ? COLORS.primary : '#e5e5e5',
                backgroundColor: messageType?.id === type.id ? `${COLORS.primary}15` : 'white'
              }}
            >
              <span className="text-2xl block mb-2">{type.icon}</span>
              <p className="text-sm" style={{ color: messageType?.id === type.id ? COLORS.primary : COLORS.text, fontWeight: messageType?.id === type.id ? 'bold' : 'normal' }}>
                {type.name}
              </p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Subject & Message */}
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2 text-right" style={{ color: COLORS.text }}>الموضوع</label>
          <input
            type="text"
            value={messageSubject}
            onChange={(e) => setMessageSubject(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl text-right"
            style={{ borderColor: COLORS.primaryLight }}
            placeholder="أدخل موضوع الرسالة"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2 text-right" style={{ color: COLORS.text }}>الرسالة</label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl text-right h-40 resize-none"
            style={{ borderColor: COLORS.primaryLight }}
            placeholder="اكتب رسالتك هنا..."
          />
        </div>
      </div>
      
      {/* Submit */}
      <div className="p-4">
        <button
          onClick={handleSendMessage}
          disabled={!messageType || !messageSubject || !messageText || loading}
          className="w-full text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
          style={{ backgroundColor: COLORS.primary }}
        >
          {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
        </button>
        <div className="mt-4 p-3 rounded border-r-4" style={{ backgroundColor: `${COLORS.warning}20`, borderColor: COLORS.warning }}>
          <p className="text-sm text-right" style={{ color: COLORS.primaryDark }}>
            💡 سيتم إرسال رسالتك للإدارة وسيتم الرد عليك في أقرب وقت
          </p>
        </div>
      </div>
    </div>
  );

  // Settings Screen
  const renderSettings = () => (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* Header */}
      <div className="text-white p-4 flex items-center justify-between" style={{ backgroundColor: COLORS.primary }}>
        <div></div>
        <h1 className="text-lg font-bold">الإعدادات</h1>
        <button onClick={() => setCurrentScreen('dashboard')} className="text-2xl">←</button>
      </div>
      
      {/* User Info */}
      <div className="text-white text-center pb-8 pt-2" style={{ backgroundColor: COLORS.primary }}>
        <img src="/logo-marooj.png" alt="Logo" className="w-20 h-20 mx-auto rounded-full bg-white p-2 mb-3" />
        <h2 className="text-xl font-bold">{user?.name}</h2>
        <p className="text-white/70">كود: {user?.code}</p>
        <p className="text-white/60 text-sm">{user?.center_name}</p>
      </div>
      
      {/* Change Password */}
      <div className="bg-white m-4 rounded-xl p-4 shadow">
        <h3 className="text-lg font-bold mb-4 text-right" style={{ color: COLORS.text }}>تغيير كلمة المرور</h3>
        <div className="space-y-4">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl text-right"
            style={{ borderColor: COLORS.primaryLight }}
            placeholder="كلمة المرور الحالية"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl text-right"
            style={{ borderColor: COLORS.primaryLight }}
            placeholder="كلمة المرور الجديدة"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl text-right"
            style={{ borderColor: COLORS.primaryLight }}
            placeholder="تأكيد كلمة المرور الجديدة"
          />
          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="w-full text-white py-3 rounded-xl font-bold disabled:opacity-50"
            style={{ backgroundColor: COLORS.success }}
          >
            {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </div>
      </div>
      
      {/* Account Info */}
      <div className="bg-white m-4 rounded-xl p-4 shadow">
        <h3 className="text-lg font-bold mb-4 text-right" style={{ color: COLORS.text }}>معلومات الحساب</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="font-bold">{user?.phone || '-'}</span>
            <span style={{ color: COLORS.textLight }}>رقم الهاتف:</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="font-bold">
              {user?.milk_type === 'cow' ? '🐄 بقري' : user?.milk_type === 'camel' ? '🐪 إبل' : user?.milk_type || '-'}
            </span>
            <span style={{ color: COLORS.textLight }}>نوع الحليب:</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="font-bold">{user?.center_name || '-'}</span>
            <span style={{ color: COLORS.textLight }}>المركز:</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-bold" style={{ color: COLORS.success }}>{formatCurrency(user?.balance)}</span>
            <span style={{ color: COLORS.textLight }}>الرصيد:</span>
          </div>
        </div>
      </div>
      
      {/* Logout */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full text-white py-4 rounded-xl font-bold"
          style={{ backgroundColor: COLORS.danger }}
        >
          تسجيل الخروج
        </button>
      </div>
      
      {/* App Info */}
      <div className="text-center py-4 text-sm" style={{ color: COLORS.textLight }}>
        <p>المروج للألبان - بوابة الموردين</p>
        <p>الإصدار 1.0.0</p>
      </div>
    </div>
  );

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'login': return renderLogin();
      case 'recovery': return renderRecovery();
      case 'dashboard': return renderDashboard();
      case 'feed-request': return renderFeedRequest();
      case 'supplies': return renderSupplies();
      case 'message': return renderMessage();
      case 'settings': return renderSettings();
      default: return renderLogin();
    }
  };

  return (
    <div dir="rtl" className="font-sans">
      {renderScreen()}
    </div>
  );
};

export default SupplierApp;
