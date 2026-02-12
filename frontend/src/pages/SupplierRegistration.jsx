import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast, Toaster } from "sonner";

// Get API URL
const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Company Logo URL
const LOGO_URL = "/almorooj-logo.png";

// Company Logo Component
const CompanyLogo = ({ size = 100 }) => (
  <div style={{
    width: `${size}px`,
    height: `${size}px`,
    margin: '0 auto 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <img 
      src={LOGO_URL} 
      alt="المروج للألبان" 
      style={{ 
        width: '100%', 
        height: '100%', 
        objectFit: 'contain' 
      }}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
    <div style={{
      display: 'none',
      width: `${size}px`,
      height: `${size}px`,
      background: '#c4a574',
      borderRadius: '50%',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${size * 0.5}px`
    }}>
      🐄
    </div>
  </div>
);

const SupplierRegistration = () => {
  // States
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [activeTab, setActiveTab] = useState('register'); // register, check
  
  const [form, setForm] = useState({
    civil_id: '',
    phone: '',
    name: '',
    milk_type: '',
    expected_quantity: '',
    address: '',
    notes: ''
  });
  
  const [document, setDocument] = useState(null);
  const [checkCivilId, setCheckCivilId] = useState('');
  const fileInputRef = useRef(null);

  // Check registration status on load
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API}/supplier-registration/check-status`);
      setRegistrationStatus(res.data);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.civil_id || !form.phone || !form.name || !form.milk_type || !form.expected_quantity) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('civil_id', form.civil_id);
      formData.append('phone', form.phone);
      formData.append('name', form.name);
      formData.append('milk_type', form.milk_type);
      formData.append('expected_quantity', form.expected_quantity);
      formData.append('address', form.address || '');
      formData.append('notes', form.notes || '');
      
      if (document) {
        formData.append('document', document);
      }
      
      const res = await axios.post(`${API}/supplier-registration/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setRegistrationResult(res.data);
      setSubmitted(true);
      toast.success('تم تقديم طلبك بنجاح');
      
    } catch (error) {
      const msg = error.response?.data?.detail || 'حدث خطأ أثناء التسجيل';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    
    if (!checkCivilId) {
      toast.error('يرجى إدخال الرقم المدني');
      return;
    }
    
    try {
      const res = await axios.get(`${API}/supplier-registration/check/${checkCivilId}`);
      setCheckResult(res.data);
    } catch (error) {
      toast.error('حدث خطأ أثناء البحث');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 10 ميجابايت');
        return;
      }
      setDocument(file);
    }
  };

  // Print receipt
  const printReceipt = () => {
    const printContent = document.getElementById('receipt-content');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>إيصال التسجيل</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
          .receipt { max-width: 600px; margin: 0 auto; border: 3px solid #8B5A2B; padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 60px; margin-bottom: 10px; }
          .company-name { font-size: 24px; color: #8B5A2B; font-weight: bold; }
          .title { font-size: 20px; margin: 20px 0; color: #8B5A2B; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .label { color: #666; }
          .value { font-weight: bold; }
          .status { background: #fef3c7; color: #92400e; padding: 15px; text-align: center; border-radius: 10px; margin: 20px 0; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Styles - Brown theme
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
      padding: '30px',
      maxWidth: '500px',
      margin: '0 auto',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
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
    tabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '24px'
    },
    tab: {
      flex: 1,
      padding: '12px',
      border: 'none',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    tabActive: {
      background: '#047857',
      color: 'white'
    },
    tabInactive: {
      background: '#f3f4f6',
      color: '#666'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: 'bold',
      color: '#333',
      fontSize: '14px'
    },
    required: {
      color: '#dc2626',
      marginRight: '4px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      marginBottom: '16px',
      fontSize: '16px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      marginBottom: '16px',
      fontSize: '16px',
      outline: 'none',
      boxSizing: 'border-box',
      background: 'white'
    },
    fileInput: {
      display: 'none'
    },
    fileButton: {
      width: '100%',
      padding: '20px',
      border: '2px dashed #d1d5db',
      borderRadius: '10px',
      marginBottom: '16px',
      textAlign: 'center',
      cursor: 'pointer',
      background: '#f9fafb',
      transition: 'all 0.2s'
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
      cursor: 'pointer'
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
      marginTop: '10px'
    },
    closedBanner: {
      background: '#fee2e2',
      color: '#dc2626',
      padding: '20px',
      borderRadius: '10px',
      textAlign: 'center'
    },
    receipt: {
      border: '3px solid #8B5A2B',
      borderRadius: '10px',
      padding: '20px',
      marginBottom: '20px'
    },
    statusBadge: {
      display: 'inline-block',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <p>جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  // Registration Closed
  if (!registrationStatus?.is_open && !submitted) {
    return (
      <div style={styles.container}>
        <Toaster position="top-center" richColors />
        <div style={styles.card}>
          <CompanyLogo />
          <h1 style={styles.title}>المروج للألبان</h1>
          <p style={styles.subtitle}>تسجيل الموردين الجدد</p>
          
          <div style={styles.closedBanner}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔒</div>
            <h3 style={{ margin: '0 0 10px' }}>التسجيل مغلق حالياً</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              يرجى المحاولة لاحقاً أو التواصل مع الإدارة
            </p>
          </div>
          
          {/* Check existing registration */}
          <div style={{ marginTop: '24px' }}>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '12px' }}>
              هل سبق وقدمت طلباً؟
            </p>
            <form onSubmit={handleCheck}>
              <input
                type="text"
                placeholder="أدخل الرقم المدني للتحقق"
                value={checkCivilId}
                onChange={(e) => setCheckCivilId(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.buttonOutline}>
                التحقق من حالة الطلب
              </button>
            </form>
            
            {checkResult && (
              <div style={{ marginTop: '16px', padding: '16px', background: '#f3f4f6', borderRadius: '10px' }}>
                {checkResult.found ? (
                  <>
                    <p><strong>رقم الطلب:</strong> {checkResult.registration_number}</p>
                    <p><strong>الاسم:</strong> {checkResult.name}</p>
                    <p><strong>الحالة:</strong> 
                      <span style={{
                        ...styles.statusBadge,
                        marginRight: '8px',
                        background: checkResult.status === 'approved' ? '#dcfce7' : 
                                   checkResult.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                        color: checkResult.status === 'approved' ? '#16a34a' : 
                               checkResult.status === 'rejected' ? '#dc2626' : '#92400e'
                      }}>
                        {checkResult.status_message}
                      </span>
                    </p>
                  </>
                ) : (
                  <p style={{ color: '#666' }}>{checkResult.message}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success / Receipt
  if (submitted && registrationResult) {
    return (
      <div style={styles.container}>
        <Toaster position="top-center" richColors />
        <div style={styles.card}>
          <div id="receipt-content">
            <div style={styles.receipt}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <CompanyLogo />
                <h2 style={{ color: '#047857', margin: '10px 0' }}>المروج للألبان</h2>
                <p style={{ color: '#666', margin: 0 }}>Almorooj Dairy</p>
              </div>
              
              <h3 style={{ textAlign: 'center', color: '#8B5A2B', borderBottom: '2px solid #8B5A2B', paddingBottom: '10px' }}>
                إيصال تسجيل مورد
              </h3>
              
              <div style={{ margin: '20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>رقم الطلب:</span>
                  <span style={{ fontWeight: 'bold' }}>{registrationResult.registration_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>الاسم:</span>
                  <span style={{ fontWeight: 'bold' }}>{form.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>الرقم المدني:</span>
                  <span style={{ fontWeight: 'bold' }}>{form.civil_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>نوع الحليب:</span>
                  <span style={{ fontWeight: 'bold' }}>{form.milk_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>الكمية المتوقعة:</span>
                  <span style={{ fontWeight: 'bold' }}>{form.expected_quantity} لتر/يوم</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>تاريخ التقديم:</span>
                  <span style={{ fontWeight: 'bold' }}>{new Date().toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
              
              <div style={{ 
                background: '#fef3c7', 
                color: '#92400e', 
                padding: '15px', 
                textAlign: 'center', 
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                ⏳ قيد الإجراءات
              </div>
              
              <p style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginTop: '20px' }}>
                سيتم التواصل معكم عبر الهاتف {form.phone} عند اكتمال الإجراءات
              </p>
            </div>
          </div>
          
          <button onClick={printReceipt} style={styles.button}>
            🖨️ طباعة الإيصال
          </button>
          
          <button 
            onClick={() => {
              setSubmitted(false);
              setRegistrationResult(null);
              setForm({ civil_id: '', phone: '', name: '', milk_type: '', expected_quantity: '', address: '', notes: '' });
              setDocument(null);
            }} 
            style={styles.buttonOutline}
          >
            تسجيل مورد آخر
          </button>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div style={styles.container}>
      <Toaster position="top-center" richColors />
      <div style={styles.card}>
        <CompanyLogo />
        <h1 style={styles.title}>المروج للألبان</h1>
        <p style={styles.subtitle}>تسجيل الموردين الجدد</p>
        
        {registrationStatus?.message && (
          <div style={{ 
            background: '#dcfce7', 
            color: '#16a34a', 
            padding: '10px', 
            borderRadius: '8px', 
            textAlign: 'center',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            ✓ {registrationStatus.message}
          </div>
        )}
        
        {/* Tabs */}
        <div style={styles.tabs}>
          <button 
            style={{ ...styles.tab, ...(activeTab === 'register' ? styles.tabActive : styles.tabInactive) }}
            onClick={() => setActiveTab('register')}
          >
            تسجيل جديد
          </button>
          <button 
            style={{ ...styles.tab, ...(activeTab === 'check' ? styles.tabActive : styles.tabInactive) }}
            onClick={() => setActiveTab('check')}
          >
            متابعة طلب
          </button>
        </div>
        
        {activeTab === 'register' ? (
          <form onSubmit={handleSubmit}>
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                الرقم المدني
              </label>
              <input
                type="text"
                value={form.civil_id}
                onChange={(e) => setForm({ ...form, civil_id: e.target.value })}
                style={styles.input}
                placeholder="أدخل الرقم المدني"
                required
              />
            </div>
            
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                الاسم الكامل
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={styles.input}
                placeholder="أدخل الاسم الكامل"
                required
              />
            </div>
            
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={styles.input}
                placeholder="مثال: 99123456"
                required
              />
            </div>
            
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                نوع الحليب
              </label>
              <select
                value={form.milk_type}
                onChange={(e) => setForm({ ...form, milk_type: e.target.value })}
                style={styles.select}
                required
              >
                <option value="">اختر نوع الحليب</option>
                {(registrationStatus?.milk_types || ['أبقار', 'أغنام', 'إبل']).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                الكمية المتوقعة (لتر/يوم)
              </label>
              <input
                type="number"
                value={form.expected_quantity}
                onChange={(e) => setForm({ ...form, expected_quantity: e.target.value })}
                style={styles.input}
                placeholder="مثال: 50"
                min="1"
                required
              />
            </div>
            
            <div>
              <label style={styles.label}>العنوان</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                style={styles.input}
                placeholder="الولاية / القرية"
              />
            </div>
            
            <div>
              <label style={styles.label}>إرفاق المستندات</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={styles.fileInput}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <div 
                style={styles.fileButton}
                onClick={() => fileInputRef.current?.click()}
              >
                {document ? (
                  <span style={{ color: '#047857' }}>✓ {document.name}</span>
                ) : (
                  <>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📎</span>
                    <span style={{ color: '#666' }}>اضغط لإرفاق ملف (PDF, صورة)</span>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <label style={styles.label}>ملاحظات إضافية</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                placeholder="أي معلومات إضافية..."
              />
            </div>
            
            <button 
              type="submit" 
              style={{ ...styles.button, opacity: submitting ? 0.7 : 1 }}
              disabled={submitting}
            >
              {submitting ? '⏳ جاري التسجيل...' : '✓ تقديم الطلب'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCheck}>
            <div>
              <label style={styles.label}>الرقم المدني</label>
              <input
                type="text"
                value={checkCivilId}
                onChange={(e) => setCheckCivilId(e.target.value)}
                style={styles.input}
                placeholder="أدخل الرقم المدني للتحقق"
                required
              />
            </div>
            
            <button type="submit" style={styles.button}>
              🔍 التحقق من حالة الطلب
            </button>
            
            {checkResult && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#f3f4f6', borderRadius: '10px' }}>
                {checkResult.found ? (
                  <>
                    <h3 style={{ margin: '0 0 16px', color: '#047857' }}>تفاصيل الطلب</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                      <span>رقم الطلب:</span>
                      <strong>{checkResult.registration_number}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                      <span>الاسم:</span>
                      <strong>{checkResult.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                      <span>تاريخ التقديم:</span>
                      <strong>{new Date(checkResult.created_at).toLocaleDateString('ar-SA')}</strong>
                    </div>
                    <div style={{ 
                      marginTop: '16px',
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      background: checkResult.status === 'approved' ? '#dcfce7' : 
                                 checkResult.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                      color: checkResult.status === 'approved' ? '#16a34a' : 
                             checkResult.status === 'rejected' ? '#dc2626' : '#92400e'
                    }}>
                      {checkResult.status === 'approved' ? '✓ ' : checkResult.status === 'rejected' ? '✗ ' : '⏳ '}
                      {checkResult.status_message}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#666' }}>
                    <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🔍</span>
                    {checkResult.message}
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default SupplierRegistration;
