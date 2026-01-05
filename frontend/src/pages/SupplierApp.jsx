import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Feed Types
const FEED_TYPES = [
  { id: 'barley', name: 'شعير', price: 85, icon: '🌾' },
  { id: 'wheat_bran', name: 'نخالة قمح', price: 70, icon: '🌿' },
  { id: 'corn', name: 'ذرة', price: 95, icon: '🌽' },
  { id: 'alfalfa', name: 'برسيم', price: 120, icon: '🌱' },
  { id: 'mixed', name: 'علف مخلوط', price: 100, icon: '📦' },
];

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
  
  // Dashboard Data
  const [dashboardData, setDashboardData] = useState(null);
  const [supplies, setSupplies] = useState([]);
  
  // Feed Request
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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-blue-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
            <span className="text-5xl">🥛</span>
          </div>
          <h1 className="text-2xl font-bold text-blue-600">المروج للألبان</h1>
          <p className="text-gray-500">بوابة الموردين</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">كود المورد</label>
            <input
              type="text"
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right text-lg"
              placeholder="أدخل كود المورد"
              inputMode="numeric"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right text-lg"
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
            <p className="text-xs text-gray-500 text-center mt-2">كلمة المرور الافتراضية: <strong>0000</strong></p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>تسجيل الدخول</>
            )}
          </button>
        </form>
        
        <p className="text-center text-gray-400 text-sm mt-8">© 2026 المروج للألبان</p>
      </div>
    </div>
  );

  // Dashboard Screen
  const renderDashboard = () => (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-500 text-white p-6 pb-20 rounded-b-3xl">
        <div className="flex justify-between items-start">
          <button onClick={handleLogout} className="bg-white/20 px-4 py-2 rounded-full text-sm">
            خروج
          </button>
          <div className="text-right">
            <p className="text-blue-100 text-sm">مرحباً</p>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-blue-200 text-sm">كود: {user?.code}</p>
          </div>
        </div>
      </div>
      
      {/* Balance Card */}
      <div className="bg-white rounded-2xl shadow-lg mx-4 -mt-12 p-6 mb-6">
        <p className="text-gray-500 text-center text-sm">الرصيد الحالي</p>
        <p className="text-4xl font-bold text-green-500 text-center my-2">
          {formatCurrency(dashboardData?.balance || user?.balance)}
        </p>
        <div className="flex justify-around mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">
              {(dashboardData?.total_supplied || user?.total_supplied || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">إجمالي التوريد (لتر)</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{dashboardData?.supplies_count || supplies.length}</p>
            <p className="text-xs text-gray-500">عدد التوريدات</p>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-right">الخدمات</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setCurrentScreen('feed-request')}
            className="bg-green-500 text-white p-5 rounded-2xl text-center shadow-lg hover:bg-green-600 transition"
          >
            <span className="text-3xl block mb-2">🌾</span>
            <span className="font-bold">طلب أعلاف</span>
          </button>
          <button
            onClick={() => setCurrentScreen('supplies')}
            className="bg-blue-500 text-white p-5 rounded-2xl text-center shadow-lg hover:bg-blue-600 transition"
          >
            <span className="text-3xl block mb-2">📊</span>
            <span className="font-bold">سجل التوريدات</span>
          </button>
          <button
            onClick={() => setCurrentScreen('message')}
            className="bg-orange-500 text-white p-5 rounded-2xl text-center shadow-lg hover:bg-orange-600 transition"
          >
            <span className="text-3xl block mb-2">💬</span>
            <span className="font-bold">إرسال رسالة</span>
          </button>
          <button
            onClick={() => setCurrentScreen('settings')}
            className="bg-purple-500 text-white p-5 rounded-2xl text-center shadow-lg hover:bg-purple-600 transition"
          >
            <span className="text-3xl block mb-2">⚙️</span>
            <span className="font-bold">الإعدادات</span>
          </button>
        </div>
      </div>
      
      {/* Recent Supplies */}
      <div className="px-4 pb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentScreen('supplies')} className="text-blue-500 text-sm">
            عرض الكل
          </button>
          <h3 className="text-lg font-bold text-gray-800">آخر التوريدات</h3>
        </div>
        {supplies.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            لا توجد توريدات حديثة
          </div>
        ) : (
          <div className="space-y-3">
            {supplies.slice(0, 5).map((supply, index) => (
              <div key={supply.id || index} className="bg-white rounded-xl p-4 flex justify-between items-center shadow">
                <div className="text-left">
                  <p className="font-bold text-gray-800">{supply.quantity?.toLocaleString()} لتر</p>
                  <p className="text-green-500 text-sm">{formatCurrency(supply.total_price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">{formatDate(supply.date)}</p>
                  <p className="text-gray-400 text-sm">{supply.milk_type === 'cow' ? '🐄 بقري' : '🐪 إبل'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Center Info */}
      <div className="text-center pb-8 text-gray-500 text-sm">
        المركز: {user?.center_name || '-'}
      </div>
    </div>
  );

  // Feed Request Screen
  const renderFeedRequest = () => (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
        <div></div>
        <h1 className="text-lg font-bold">طلب أعلاف</h1>
        <button onClick={() => setCurrentScreen('dashboard')} className="text-2xl">←</button>
      </div>
      
      {/* Balance */}
      <div className="bg-green-500 text-white text-center p-4 mx-4 mt-4 rounded-xl">
        <p className="text-sm opacity-80">رصيدك الحالي</p>
        <p className="text-2xl font-bold">{formatCurrency(user?.balance)}</p>
      </div>
      
      {/* Feed Types */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-right">اختر نوع العلف</h3>
        <div className="grid grid-cols-2 gap-3">
          {FEED_TYPES.map((feed) => (
            <button
              key={feed.id}
              onClick={() => setSelectedFeed(feed)}
              className={`p-4 rounded-xl text-center border-2 transition ${
                selectedFeed?.id === feed.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <span className="text-3xl block mb-2">{feed.icon}</span>
              <p className="font-bold text-gray-800">{feed.name}</p>
              <p className="text-green-500 text-sm">{feed.price} ريال/كجم</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Quantities */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-right">اختر الكمية (كجم)</h3>
        <div className="grid grid-cols-3 gap-3">
          {QUANTITIES.map((qty) => (
            <button
              key={qty}
              onClick={() => setSelectedQuantity(qty)}
              className={`p-4 rounded-xl font-bold text-lg transition ${
                selectedQuantity === qty
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {qty}
            </button>
          ))}
        </div>
      </div>
      
      {/* Summary */}
      {selectedFeed && selectedQuantity && (
        <div className="bg-white mx-4 p-4 rounded-xl shadow">
          <h4 className="font-bold text-gray-800 mb-3 text-right border-b pb-2">ملخص الطلب</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-bold">{selectedFeed.name}</span>
              <span className="text-gray-500">نوع العلف:</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">{selectedQuantity} كجم</span>
              <span className="text-gray-500">الكمية:</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-bold text-xl text-green-500">
                {formatCurrency(selectedFeed.price * selectedQuantity)}
              </span>
              <span className="text-gray-700 font-bold">الإجمالي:</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Submit Button */}
      <div className="p-4">
        <button
          onClick={handleSubmitFeedRequest}
          disabled={!selectedFeed || !selectedQuantity || loading}
          className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'إرسال الطلب'
          )}
        </button>
        <p className="text-center text-orange-500 text-xs mt-3">
          ⚠️ سيتم خصم المبلغ من رصيدك بعد موافقة الإدارة
        </p>
      </div>
    </div>
  );

  // Supplies Screen
  const renderSupplies = () => (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
        <div></div>
        <h1 className="text-lg font-bold">سجل التوريدات</h1>
        <button onClick={() => setCurrentScreen('dashboard')} className="text-2xl">←</button>
      </div>
      
      {/* Summary */}
      <div className="bg-blue-500 text-white flex">
        <div className="flex-1 text-center py-4 border-l border-blue-400">
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
            <p className="text-gray-500">لا توجد توريدات</p>
          </div>
        ) : (
          supplies.map((supply, index) => (
            <div key={supply.id || index} className="bg-white rounded-xl overflow-hidden shadow">
              <div className="flex justify-between items-center p-3 border-b bg-gray-50">
                <span className="text-sm text-gray-600">
                  {supply.milk_type === 'cow' ? '🐄 بقري' : '🐪 إبل'}
                </span>
                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm">
                  {formatDate(supply.date)}
                </span>
              </div>
              <div className="p-4 flex justify-around text-center">
                <div>
                  <p className="text-xl font-bold text-gray-800">{supply.quantity?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">الكمية (لتر)</p>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div>
                  <p className="text-xl font-bold text-gray-800">{supply.fat_percentage || '-'}%</p>
                  <p className="text-xs text-gray-500">نسبة الدسم</p>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div>
                  <p className="text-xl font-bold text-gray-800">{supply.price_per_liter || '-'}</p>
                  <p className="text-xs text-gray-500">سعر اللتر</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 flex justify-between items-center">
                <p className="font-bold text-green-500 text-lg">{formatCurrency(supply.total_price)}</p>
                <p className="text-gray-500 text-sm">الإجمالي:</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Message Screen
  const renderMessage = () => (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
        <div></div>
        <h1 className="text-lg font-bold">إرسال رسالة</h1>
        <button onClick={() => setCurrentScreen('dashboard')} className="text-2xl">←</button>
      </div>
      
      {/* Message Type */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-right">نوع الرسالة</h3>
        <div className="grid grid-cols-2 gap-3">
          {MESSAGE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setMessageType(type)}
              className={`p-4 rounded-xl text-center border-2 transition ${
                messageType?.id === type.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <span className="text-2xl block mb-2">{type.icon}</span>
              <p className={`text-sm ${messageType?.id === type.id ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                {type.name}
              </p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Subject & Message */}
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2 text-right">الموضوع</label>
          <input
            type="text"
            value={messageSubject}
            onChange={(e) => setMessageSubject(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-right"
            placeholder="أدخل موضوع الرسالة"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2 text-right">الرسالة</label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-right h-40 resize-none"
            placeholder="اكتب رسالتك هنا..."
          />
        </div>
      </div>
      
      {/* Submit */}
      <div className="p-4">
        <button
          onClick={handleSendMessage}
          disabled={!messageType || !messageSubject || !messageText || loading}
          className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
        >
          {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
        </button>
        <div className="bg-orange-50 border-r-4 border-orange-500 p-3 mt-4 rounded">
          <p className="text-orange-700 text-sm text-right">
            💡 سيتم إرسال رسالتك للإدارة وسيتم الرد عليك في أقرب وقت
          </p>
        </div>
      </div>
    </div>
  );

  // Settings Screen
  const renderSettings = () => (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
        <div></div>
        <h1 className="text-lg font-bold">الإعدادات</h1>
        <button onClick={() => setCurrentScreen('dashboard')} className="text-2xl">←</button>
      </div>
      
      {/* User Info */}
      <div className="bg-blue-500 text-white text-center pb-8 pt-2">
        <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-3">
          <span className="text-4xl">{user?.name?.charAt(0) || '👤'}</span>
        </div>
        <h2 className="text-xl font-bold">{user?.name}</h2>
        <p className="text-blue-200">كود: {user?.code}</p>
        <p className="text-blue-300 text-sm">{user?.center_name}</p>
      </div>
      
      {/* Change Password */}
      <div className="bg-white m-4 rounded-xl p-4 shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-right">تغيير كلمة المرور</h3>
        <div className="space-y-4">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-right"
            placeholder="كلمة المرور الحالية"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-right"
            placeholder="كلمة المرور الجديدة"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-right"
            placeholder="تأكيد كلمة المرور الجديدة"
          />
          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </div>
      </div>
      
      {/* Account Info */}
      <div className="bg-white m-4 rounded-xl p-4 shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-right">معلومات الحساب</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="font-bold">{user?.phone || '-'}</span>
            <span className="text-gray-500">رقم الهاتف:</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="font-bold">
              {user?.milk_type === 'cow' ? '🐄 بقري' : user?.milk_type === 'camel' ? '🐪 إبل' : user?.milk_type || '-'}
            </span>
            <span className="text-gray-500">نوع الحليب:</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="font-bold">{user?.center_name || '-'}</span>
            <span className="text-gray-500">المركز:</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-bold text-green-500">{formatCurrency(user?.balance)}</span>
            <span className="text-gray-500">الرصيد:</span>
          </div>
        </div>
      </div>
      
      {/* Logout */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white py-4 rounded-xl font-bold"
        >
          تسجيل الخروج
        </button>
      </div>
      
      {/* App Info */}
      <div className="text-center py-4 text-gray-400 text-sm">
        <p>المروج للألبان - بوابة الموردين</p>
        <p>الإصدار 1.0.0</p>
      </div>
    </div>
  );

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'login': return renderLogin();
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
