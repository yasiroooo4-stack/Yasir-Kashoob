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

// Translations
const translations = {
  ar: {
    companyName: "المروج للألبان",
    pageTitle: "تسجيل الموردين الجدد",
    registrationClosed: "التسجيل مغلق حالياً",
    tryLater: "يرجى المحاولة لاحقاً أو التواصل مع الإدارة",
    alreadyApplied: "هل سبق وقدمت طلباً؟",
    civilIdPlaceholder: "أدخل الرقم المدني للتحقق",
    checkStatus: "التحقق من حالة الطلب",
    newRegistration: "تسجيل جديد",
    followUp: "متابعة طلب",
    civilId: "الرقم المدني",
    fullName: "الاسم الكامل",
    phone: "رقم الهاتف",
    milkType: "نوع الحليب",
    expectedQuantity: "الكمية المتوقعة (لتر/يوم)",
    address: "العنوان",
    attachDocs: "إرفاق المستندات",
    additionalNotes: "ملاحظات إضافية",
    submit: "تقديم الطلب",
    submitting: "جاري التسجيل...",
    required: "مطلوب",
    selectMilkType: "اختر نوع الحليب",
    cows: "أبقار",
    sheep: "أغنام",
    camels: "إبل",
    clickToAttach: "اضغط لإرفاق ملف (PDF, صورة)",
    anyAdditionalInfo: "أي معلومات إضافية...",
    registrationNumber: "رقم الطلب",
    name: "الاسم",
    status: "الحالة",
    submissionDate: "تاريخ التقديم",
    pending: "قيد الإجراءات",
    approved: "تمت الموافقة",
    rejected: "مرفوض",
    receiptTitle: "إيصال تسجيل مورد",
    printReceipt: "طباعة الإيصال",
    registerAnother: "تسجيل مورد آخر",
    contactVia: "سيتم التواصل معكم عبر الهاتف",
    whenComplete: "عند اكتمال الإجراءات",
    loading: "جاري التحميل...",
    requestDetails: "تفاصيل الطلب",
    notFound: "لم يتم العثور على طلب بهذا الرقم",
    enterCivilId: "أدخل الرقم المدني",
    phonePlaceholder: "مثال: 99123456",
    quantityPlaceholder: "مثال: 50",
    addressPlaceholder: "الولاية / القرية",
    enterFullName: "أدخل الاسم الكامل",
    fillAllFields: "يرجى ملء جميع الحقول المطلوبة",
    successSubmit: "تم تقديم طلبك بنجاح",
    errorSubmit: "حدث خطأ أثناء التسجيل",
    errorSearch: "حدث خطأ أثناء البحث",
    fileSizeError: "حجم الملف يجب أن يكون أقل من 10 ميجابايت",
    litersPerDay: "لتر/يوم"
  },
  en: {
    companyName: "Almorooj Dairy",
    pageTitle: "New Supplier Registration",
    registrationClosed: "Registration is Currently Closed",
    tryLater: "Please try again later or contact the administration",
    alreadyApplied: "Have you already applied?",
    civilIdPlaceholder: "Enter Civil ID to check",
    checkStatus: "Check Application Status",
    newRegistration: "New Registration",
    followUp: "Follow Up",
    civilId: "Civil ID",
    fullName: "Full Name",
    phone: "Phone Number",
    milkType: "Milk Type",
    expectedQuantity: "Expected Quantity (liters/day)",
    address: "Address",
    attachDocs: "Attach Documents",
    additionalNotes: "Additional Notes",
    submit: "Submit Application",
    submitting: "Submitting...",
    required: "Required",
    selectMilkType: "Select milk type",
    cows: "Cow",
    sheep: "Sheep",
    camels: "Camel",
    clickToAttach: "Click to attach file (PDF, Image)",
    anyAdditionalInfo: "Any additional information...",
    registrationNumber: "Application Number",
    name: "Name",
    status: "Status",
    submissionDate: "Submission Date",
    pending: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
    receiptTitle: "Supplier Registration Receipt",
    printReceipt: "Print Receipt",
    registerAnother: "Register Another Supplier",
    contactVia: "You will be contacted via phone",
    whenComplete: "when procedures are complete",
    loading: "Loading...",
    requestDetails: "Application Details",
    notFound: "No application found with this ID",
    enterCivilId: "Enter Civil ID",
    phonePlaceholder: "Example: 99123456",
    quantityPlaceholder: "Example: 50",
    addressPlaceholder: "State / Village",
    enterFullName: "Enter full name",
    fillAllFields: "Please fill all required fields",
    successSubmit: "Your application was submitted successfully",
    errorSubmit: "An error occurred during registration",
    errorSearch: "An error occurred while searching",
    fileSizeError: "File size must be less than 10 MB",
    litersPerDay: "liters/day"
  }
};

const SupplierRegistration = () => {
  // Language state
  const [lang, setLang] = useState('ar');
  const t = translations[lang];
  
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
      background: '#8B5A2B',
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
      background: '#8B5A2B',
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
      color: '#8B5A2B',
      border: '2px solid #8B5A2B',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px'
    },
    langSwitch: {
      position: 'absolute',
      top: '10px',
      left: lang === 'ar' ? '10px' : 'auto',
      right: lang === 'ar' ? 'auto' : '10px',
      background: 'rgba(255,255,255,0.9)',
      border: 'none',
      borderRadius: '20px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      color: '#8B5A2B',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
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
      <div style={{...styles.container, direction: lang === 'ar' ? 'rtl' : 'ltr'}}>
        <button 
          style={styles.langSwitch} 
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        >
          {lang === 'ar' ? '🌐 English' : '🌐 العربية'}
        </button>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <p>{t.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  // Registration Closed
  if (!registrationStatus?.is_open && !submitted) {
    return (
      <div style={{...styles.container, direction: lang === 'ar' ? 'rtl' : 'ltr'}}>
        <Toaster position="top-center" richColors />
        <button 
          style={styles.langSwitch} 
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        >
          {lang === 'ar' ? '🌐 English' : '🌐 العربية'}
        </button>
        <div style={styles.card}>
          <CompanyLogo />
          <h1 style={styles.title}>{t.companyName}</h1>
          <p style={styles.subtitle}>{t.pageTitle}</p>
          
          <div style={styles.closedBanner}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔒</div>
            <h3 style={{ margin: '0 0 10px' }}>{t.registrationClosed}</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {t.tryLater}
            </p>
          </div>
          
          {/* Check existing registration */}
          <div style={{ marginTop: '24px' }}>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '12px' }}>
              {t.alreadyApplied}
            </p>
            <form onSubmit={handleCheck}>
              <input
                type="text"
                placeholder={t.civilIdPlaceholder}
                value={checkCivilId}
                onChange={(e) => setCheckCivilId(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.buttonOutline}>
                {t.checkStatus}
              </button>
            </form>
            
            {checkResult && (
              <div style={{ marginTop: '16px', padding: '16px', background: '#f3f4f6', borderRadius: '10px' }}>
                {checkResult.found ? (
                  <>
                    <p><strong>{t.registrationNumber}:</strong> {checkResult.registration_number}</p>
                    <p><strong>{t.name}:</strong> {checkResult.name}</p>
                    <p><strong>{t.status}:</strong> 
                      <span style={{
                        ...styles.statusBadge,
                        marginRight: lang === 'ar' ? '8px' : '0',
                        marginLeft: lang === 'en' ? '8px' : '0',
                        background: checkResult.status === 'approved' ? '#dcfce7' : 
                                   checkResult.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                        color: checkResult.status === 'approved' ? '#16a34a' : 
                               checkResult.status === 'rejected' ? '#dc2626' : '#92400e'
                      }}>
                        {checkResult.status === 'approved' ? t.approved : 
                         checkResult.status === 'rejected' ? t.rejected : t.pending}
                      </span>
                    </p>
                  </>
                ) : (
                  <p style={{ color: '#666' }}>{t.notFound}</p>
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
      <div style={{...styles.container, direction: lang === 'ar' ? 'rtl' : 'ltr'}}>
        <Toaster position="top-center" richColors />
        <button 
          style={styles.langSwitch} 
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        >
          {lang === 'ar' ? '🌐 English' : '🌐 العربية'}
        </button>
        <div style={styles.card}>
          <div id="receipt-content">
            <div style={styles.receipt}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <CompanyLogo />
                <h2 style={{ color: '#8B5A2B', margin: '10px 0' }}>{t.companyName}</h2>
                <p style={{ color: '#666', margin: 0 }}>Almorooj Dairy</p>
              </div>
              
              <h3 style={{ textAlign: 'center', color: '#8B5A2B', borderBottom: '2px solid #8B5A2B', paddingBottom: '10px' }}>
                {t.receiptTitle}
              </h3>
              
              <div style={{ margin: '20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>{t.registrationNumber}:</span>
                  <span style={{ fontWeight: 'bold' }}>{registrationResult.registration_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>{t.name}:</span>
                  <span style={{ fontWeight: 'bold' }}>{form.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>{t.civilId}:</span>
                  <span style={{ fontWeight: 'bold' }}>{form.civil_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>{t.milkType}:</span>
                  <span style={{ fontWeight: 'bold' }}>{form.milk_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>{t.expectedQuantity}:</span>
                  <span style={{ fontWeight: 'bold' }}>{form.expected_quantity} {t.litersPerDay}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#666' }}>{t.submissionDate}:</span>
                  <span style={{ fontWeight: 'bold' }}>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
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
                ⏳ {t.pending}
              </div>
              
              <p style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginTop: '20px' }}>
                {t.contactVia} {form.phone} {t.whenComplete}
              </p>
            </div>
          </div>
          
          <button onClick={printReceipt} style={styles.button}>
            🖨️ {t.printReceipt}
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
            {t.registerAnother}
          </button>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div style={{...styles.container, direction: lang === 'ar' ? 'rtl' : 'ltr'}}>
      <Toaster position="top-center" richColors />
      <button 
        style={styles.langSwitch} 
        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      >
        {lang === 'ar' ? '🌐 English' : '🌐 العربية'}
      </button>
      <div style={styles.card}>
        <CompanyLogo />
        <h1 style={styles.title}>{t.companyName}</h1>
        <p style={styles.subtitle}>{t.pageTitle}</p>
        
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
            {t.newRegistration}
          </button>
          <button 
            style={{ ...styles.tab, ...(activeTab === 'check' ? styles.tabActive : styles.tabInactive) }}
            onClick={() => setActiveTab('check')}
          >
            {t.followUp}
          </button>
        </div>
        
        {activeTab === 'register' ? (
          <form onSubmit={handleSubmit}>
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                {t.civilId}
              </label>
              <input
                type="text"
                value={form.civil_id}
                onChange={(e) => setForm({ ...form, civil_id: e.target.value })}
                style={styles.input}
                placeholder={t.enterCivilId}
                required
              />
            </div>
            
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                {t.fullName}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={styles.input}
                placeholder={t.enterFullName}
                required
              />
            </div>
            
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                {t.phone}
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={styles.input}
                placeholder={t.phonePlaceholder}
                required
              />
            </div>
            
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                {t.milkType}
              </label>
              <select
                value={form.milk_type}
                onChange={(e) => setForm({ ...form, milk_type: e.target.value })}
                style={styles.select}
                required
              >
                <option value="">{t.selectMilkType}</option>
                <option value={lang === 'ar' ? 'أبقار' : 'Cow'}>{t.cows}</option>
                <option value={lang === 'ar' ? 'أغنام' : 'Sheep'}>{t.sheep}</option>
                <option value={lang === 'ar' ? 'إبل' : 'Camel'}>{t.camels}</option>
              </select>
            </div>
            
            <div>
              <label style={styles.label}>
                <span style={styles.required}>*</span>
                {t.expectedQuantity}
              </label>
              <input
                type="number"
                value={form.expected_quantity}
                onChange={(e) => setForm({ ...form, expected_quantity: e.target.value })}
                style={styles.input}
                placeholder={t.quantityPlaceholder}
                min="1"
                required
              />
            </div>
            
            <div>
              <label style={styles.label}>{t.address}</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                style={styles.input}
                placeholder={t.addressPlaceholder}
              />
            </div>
            
            <div>
              <label style={styles.label}>{t.attachDocs}</label>
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
                  <span style={{ color: '#8B5A2B' }}>✓ {document.name}</span>
                ) : (
                  <>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📎</span>
                    <span style={{ color: '#666' }}>{t.clickToAttach}</span>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <label style={styles.label}>{t.additionalNotes}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                placeholder={t.anyAdditionalInfo}
              />
            </div>
            
            <button 
              type="submit" 
              style={{ ...styles.button, opacity: submitting ? 0.7 : 1 }}
              disabled={submitting}
            >
              {submitting ? `⏳ ${t.submitting}` : `✓ ${t.submit}`}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCheck}>
            <div>
              <label style={styles.label}>{t.civilId}</label>
              <input
                type="text"
                value={checkCivilId}
                onChange={(e) => setCheckCivilId(e.target.value)}
                style={styles.input}
                placeholder={t.civilIdPlaceholder}
                required
              />
            </div>
            
            <button type="submit" style={styles.button}>
              🔍 {t.checkStatus}
            </button>
            
            {checkResult && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#f3f4f6', borderRadius: '10px' }}>
                {checkResult.found ? (
                  <>
                    <h3 style={{ margin: '0 0 16px', color: '#8B5A2B' }}>{t.requestDetails}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                      <span>{t.registrationNumber}:</span>
                      <strong>{checkResult.registration_number}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                      <span>{t.name}:</span>
                      <strong>{checkResult.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                      <span>{t.submissionDate}:</span>
                      <strong>{new Date(checkResult.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</strong>
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
                      {checkResult.status === 'approved' ? t.approved : 
                       checkResult.status === 'rejected' ? t.rejected : t.pending}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#666' }}>
                    <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🔍</span>
                    {t.notFound}
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
