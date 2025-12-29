import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ar: {
    translation: {
      // General
      "app_name": "مركز تجميع الحليب",
      "dashboard": "لوحة التحكم",
      "suppliers": "الموردين",
      "milk_reception": "استلام الحليب",
      "customers": "العملاء",
      "sales": "المبيعات",
      "inventory": "المخزون",
      "finance": "المالية",
      "employees": "الموظفين",
      "reports": "التقارير",
      "settings": "الإعدادات",
      "logout": "تسجيل الخروج",
      "login": "تسجيل الدخول",
      "register": "إنشاء حساب",
      "welcome": "مرحباً",
      "search": "بحث",
      "add": "إضافة",
      "edit": "تعديل",
      "delete": "حذف",
      "save": "حفظ",
      "cancel": "إلغاء",
      "confirm": "تأكيد",
      "actions": "الإجراءات",
      "status": "الحالة",
      "active": "نشط",
      "inactive": "غير نشط",
      "date": "التاريخ",
      "amount": "المبلغ",
      "quantity": "الكمية",
      "price": "السعر",
      "total": "الإجمالي",
      "notes": "ملاحظات",
      "loading": "جاري التحميل...",
      "no_data": "لا توجد بيانات",
      "success": "تمت العملية بنجاح",
      "error": "حدث خطأ",
      
      // Auth
      "username": "اسم المستخدم",
      "password": "كلمة المرور",
      "email": "البريد الإلكتروني",
      "full_name": "الاسم الكامل",
      "role": "الصلاحية",
      "admin": "مدير",
      "employee": "موظف",
      "accountant": "محاسب",
      "login_title": "تسجيل الدخول إلى النظام",
      "register_title": "إنشاء حساب جديد",
      "no_account": "ليس لديك حساب؟",
      "have_account": "لديك حساب بالفعل؟",
      
      // Dashboard
      "today_milk": "حليب اليوم",
      "today_sales": "مبيعات اليوم",
      "current_stock": "المخزون الحالي",
      "supplier_dues": "مستحقات الموردين",
      "customer_dues": "مستحقات العملاء",
      "avg_fat": "متوسط الدهون",
      "avg_protein": "متوسط البروتين",
      "liters": "لتر",
      "currency": "ر.ع",
      "supplier_code": "كود المورد",
      "bank_account": "رقم الحساب البنكي",
      "select_all": "تحديد الكل",
      "select_supplier": "تحديد المورد",
      
      // Feed (الأعلاف)
      "feed_purchases": "مشتريات الأعلاف",
      "feed_companies": "شركات الأعلاف",
      "feed_types": "أنواع الأعلاف",
      "feed_company": "شركة الأعلاف",
      "feed_type": "نوع العلف",
      "add_feed_company": "إضافة شركة أعلاف",
      "add_feed_type": "إضافة نوع علف",
      "add_feed_purchase": "شراء أعلاف",
      "unit": "الوحدة",
      "price_per_unit": "سعر الوحدة",
      "kg": "كيلوجرام",
      "bag": "كيس",
      "ton": "طن",
      "available_balance": "الرصيد المتاح",
      "total_spent": "إجمالي المصروف",
      "insufficient_balance": "الرصيد غير كافي",
      "kg_per_unit": "وزن الوحدة (كجم)",
      "edit_purchase": "تعديل المشتراة",
      "refund_note": "سيتم إرجاع المبلغ لرصيد المورد",
      
      // Centers
      "centers": "مراكز التجميع",
      "center": "المركز",
      "center_hajeef": "مركز حجيف",
      "center_zeek": "مركز زيك",
      "center_ghado": "مركز غدو",
      "add_center": "إضافة مركز",
      "center_code": "كود المركز",
      "manager_name": "اسم المدير",
      
      // Activity Log
      "activity_log": "سجل النشاط",
      "user_activity": "نشاط المستخدم",
      "action": "الإجراء",
      "timestamp": "التوقيت",
      "login_time": "وقت الدخول",
      "entity": "الكيان",
      
      // Settings
      "settings": "الإعدادات",
      "profile_settings": "إعدادات الحساب",
      "change_password": "تغيير كلمة المرور",
      "current_password": "كلمة المرور الحالية",
      "new_password": "كلمة المرور الجديدة",
      "confirm_password": "تأكيد كلمة المرور",
      "avatar": "الصورة الشخصية",
      "upload_avatar": "رفع صورة",
      
      // Devices
      "devices": "الأجهزة",
      "device_settings": "إعدادات الأجهزة",
      "milk_scale": "ميزان الحليب",
      "fat_analyzer": "جهاز الدهون",
      "quality_tester": "جهاز الفحص",
      "camera": "الكاميرا",
      "connection_type": "نوع الاتصال",
      "automatic": "تلقائي",
      "manual": "يدوي",
      
      // Reports
      "print_pdf": "طباعة PDF",
      "export_excel": "تصدير Excel",
      "print_document": "طباعة مستند",
      
      // Suppliers
      "supplier_name": "اسم المورد",
      "phone": "الهاتف",
      "address": "العنوان",
      "national_id": "رقم الهوية",
      "farm_size": "مساحة المزرعة",
      "cattle_count": "عدد المواشي",
      "total_supplied": "إجمالي التوريد",
      "balance": "الرصيد",
      "add_supplier": "إضافة مورد",
      "edit_supplier": "تعديل المورد",
      
      // Milk Reception
      "reception_date": "تاريخ الاستلام",
      "supplier": "المورد",
      "quantity_liters": "الكمية (لتر)",
      "price_per_liter": "سعر اللتر",
      "quality_test": "اختبار الجودة",
      "fat_percentage": "نسبة الدهون %",
      "protein_percentage": "نسبة البروتين %",
      "temperature": "درجة الحرارة",
      "density": "الكثافة",
      "acidity": "الحموضة",
      "water_content": "نسبة الماء",
      "is_accepted": "مقبول",
      "add_reception": "إضافة استلام",
      
      // Customers
      "customer_name": "اسم العميل",
      "customer_type": "نوع العميل",
      "retail": "تجزئة",
      "wholesale": "جملة",
      "factory": "مصنع",
      "credit_limit": "حد الائتمان",
      "total_purchases": "إجمالي المشتريات",
      "add_customer": "إضافة عميل",
      "edit_customer": "تعديل العميل",
      
      // Sales
      "sale_date": "تاريخ البيع",
      "customer": "العميل",
      "sale_type": "نوع البيع",
      "cash": "نقداً",
      "credit": "آجل",
      "is_paid": "مدفوع",
      "add_sale": "إضافة مبيعة",
      
      // Inventory
      "product_type": "نوع المنتج",
      "raw_milk": "حليب خام",
      "storage_tank": "خزان التخزين",
      "last_updated": "آخر تحديث",
      
      // Payments
      "payment_type": "نوع الدفع",
      "supplier_payment": "دفع للمورد",
      "customer_receipt": "استلام من عميل",
      "payment_method": "طريقة الدفع",
      "bank_transfer": "تحويل بنكي",
      "check": "شيك",
      "add_payment": "إضافة دفعة",
      
      // Employees
      "employee_name": "اسم الموظف",
      "position": "المنصب",
      "department": "القسم",
      "salary": "الراتب",
      "hire_date": "تاريخ التعيين",
      "add_employee": "إضافة موظف",
      "edit_employee": "تعديل الموظف",
      
      // Reports
      "daily_report": "تقرير يومي",
      "monthly_report": "تقرير شهري",
      "supplier_report": "تقرير المورد",
      "select_date": "اختر التاريخ",
      "select_month": "اختر الشهر",
      "generate_report": "إنشاء التقرير",
      "export": "تصدير",
      "print": "طباعة",
      
      // Stats
      "total_suppliers": "إجمالي الموردين",
      "total_customers": "إجمالي العملاء",
      "receptions": "الاستلامات",
      "payments": "المدفوعات",
      
      // HR
      "hr": "الموارد البشرية"
    }
  },
  en: {
    translation: {
      // General
      "app_name": "Milk Collection Center",
      "dashboard": "Dashboard",
      "suppliers": "Suppliers",
      "milk_reception": "Milk Reception",
      "customers": "Customers",
      "sales": "Sales",
      "inventory": "Inventory",
      "finance": "Finance",
      "employees": "Employees",
      "reports": "Reports",
      "settings": "Settings",
      "logout": "Logout",
      "login": "Login",
      "register": "Register",
      "welcome": "Welcome",
      "search": "Search",
      "add": "Add",
      "edit": "Edit",
      "delete": "Delete",
      "save": "Save",
      "cancel": "Cancel",
      "confirm": "Confirm",
      "actions": "Actions",
      "status": "Status",
      "active": "Active",
      "inactive": "Inactive",
      "date": "Date",
      "amount": "Amount",
      "quantity": "Quantity",
      "price": "Price",
      "total": "Total",
      "notes": "Notes",
      "loading": "Loading...",
      "no_data": "No data available",
      "success": "Operation successful",
      "error": "An error occurred",
      
      // Auth
      "username": "Username",
      "password": "Password",
      "email": "Email",
      "full_name": "Full Name",
      "role": "Role",
      "admin": "Admin",
      "employee": "Employee",
      "accountant": "Accountant",
      "login_title": "Login to System",
      "register_title": "Create New Account",
      "no_account": "Don't have an account?",
      "have_account": "Already have an account?",
      
      // Dashboard
      "today_milk": "Today's Milk",
      "today_sales": "Today's Sales",
      "current_stock": "Current Stock",
      "supplier_dues": "Supplier Dues",
      "customer_dues": "Customer Dues",
      "avg_fat": "Average Fat",
      "avg_protein": "Average Protein",
      "liters": "L",
      "currency": "OMR",
      "supplier_code": "Supplier Code",
      "bank_account": "Bank Account",
      "select_all": "Select All",
      "select_supplier": "Select Supplier",
      
      // Feed
      "feed_purchases": "Feed Purchases",
      "feed_companies": "Feed Companies",
      "feed_types": "Feed Types",
      "feed_company": "Feed Company",
      "feed_type": "Feed Type",
      "add_feed_company": "Add Feed Company",
      "add_feed_type": "Add Feed Type",
      "add_feed_purchase": "Buy Feed",
      "unit": "Unit",
      "price_per_unit": "Price per Unit",
      "kg": "Kilogram",
      "bag": "Bag",
      "ton": "Ton",
      "available_balance": "Available Balance",
      "total_spent": "Total Spent",
      "insufficient_balance": "Insufficient Balance",
      "kg_per_unit": "Weight per Unit (kg)",
      "edit_purchase": "Edit Purchase",
      "refund_note": "Amount will be refunded to supplier balance",
      
      // Centers
      "centers": "Collection Centers",
      "center": "Center",
      "center_hajeef": "Hajeef Center",
      "center_zeek": "Zeek Center",
      "center_ghado": "Ghado Center",
      "add_center": "Add Center",
      "center_code": "Center Code",
      "manager_name": "Manager Name",
      
      // Activity Log
      "activity_log": "Activity Log",
      "user_activity": "User Activity",
      "action": "Action",
      "timestamp": "Timestamp",
      "login_time": "Login Time",
      "entity": "Entity",
      
      // Settings
      "settings": "Settings",
      "profile_settings": "Profile Settings",
      "change_password": "Change Password",
      "current_password": "Current Password",
      "new_password": "New Password",
      "confirm_password": "Confirm Password",
      "avatar": "Avatar",
      "upload_avatar": "Upload Avatar",
      
      // Devices
      "devices": "Devices",
      "device_settings": "Device Settings",
      "milk_scale": "Milk Scale",
      "fat_analyzer": "Fat Analyzer",
      "quality_tester": "Quality Tester",
      "camera": "Camera",
      "connection_type": "Connection Type",
      "automatic": "Automatic",
      "manual": "Manual",
      
      // Reports
      "print_pdf": "Print PDF",
      "export_excel": "Export Excel",
      "print_document": "Print Document",
      
      // Suppliers
      "supplier_name": "Supplier Name",
      "phone": "Phone",
      "address": "Address",
      "national_id": "National ID",
      "farm_size": "Farm Size",
      "cattle_count": "Cattle Count",
      "total_supplied": "Total Supplied",
      "balance": "Balance",
      "add_supplier": "Add Supplier",
      "edit_supplier": "Edit Supplier",
      
      // Milk Reception
      "reception_date": "Reception Date",
      "supplier": "Supplier",
      "quantity_liters": "Quantity (L)",
      "price_per_liter": "Price per Liter",
      "quality_test": "Quality Test",
      "fat_percentage": "Fat %",
      "protein_percentage": "Protein %",
      "temperature": "Temperature",
      "density": "Density",
      "acidity": "Acidity",
      "water_content": "Water Content",
      "is_accepted": "Accepted",
      "add_reception": "Add Reception",
      
      // Customers
      "customer_name": "Customer Name",
      "customer_type": "Customer Type",
      "retail": "Retail",
      "wholesale": "Wholesale",
      "factory": "Factory",
      "credit_limit": "Credit Limit",
      "total_purchases": "Total Purchases",
      "add_customer": "Add Customer",
      "edit_customer": "Edit Customer",
      
      // Sales
      "sale_date": "Sale Date",
      "customer": "Customer",
      "sale_type": "Sale Type",
      "cash": "Cash",
      "credit": "Credit",
      "is_paid": "Paid",
      "add_sale": "Add Sale",
      
      // Inventory
      "product_type": "Product Type",
      "raw_milk": "Raw Milk",
      "storage_tank": "Storage Tank",
      "last_updated": "Last Updated",
      
      // Payments
      "payment_type": "Payment Type",
      "supplier_payment": "Supplier Payment",
      "customer_receipt": "Customer Receipt",
      "payment_method": "Payment Method",
      "bank_transfer": "Bank Transfer",
      "check": "Check",
      "add_payment": "Add Payment",
      
      // Employees
      "employee_name": "Employee Name",
      "position": "Position",
      "department": "Department",
      "salary": "Salary",
      "hire_date": "Hire Date",
      "add_employee": "Add Employee",
      "edit_employee": "Edit Employee",
      
      // Reports
      "daily_report": "Daily Report",
      "monthly_report": "Monthly Report",
      "supplier_report": "Supplier Report",
      "select_date": "Select Date",
      "select_month": "Select Month",
      "generate_report": "Generate Report",
      "export": "Export",
      "print": "Print",
      
      // Stats
      "total_suppliers": "Total Suppliers",
      "total_customers": "Total Customers",
      "receptions": "Receptions",
      "payments": "Payments",
      
      // HR
      "hr": "Human Resources"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
