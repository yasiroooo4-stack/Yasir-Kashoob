# تطبيق المروج للألبان - بوابة الموردين
## Al Marooj Dairy - Supplier Mobile App

تطبيق React Native للموردين يعمل على Android و iOS.

## المميزات

### 1. تسجيل الدخول
- تسجيل الدخول بكود المورد + كلمة المرور
- كلمة المرور الافتراضية: `0000`
- إمكانية تغيير كلمة المرور

### 2. لوحة التحكم
- عرض الرصيد الحالي
- إجمالي التوريدات
- آخر التوريدات
- الوصول السريع للخدمات

### 3. طلب أعلاف
- اختيار نوع العلف (شعير، نخالة، ذرة، برسيم، مخلوط)
- اختيار الكمية
- عرض الحساب التلقائي
- إرسال الطلب للموافقة

### 4. سجل التوريدات
- عرض جميع التوريدات
- تفاصيل كل توريدة (التاريخ، الكمية، السعر، نسبة الدسم)

### 5. إرسال رسالة
- أنواع الرسائل: استفسار عام، شكوى، استفسار مالي، طلب زيادة كمية
- إرسال رسالة للإدارة

### 6. الإعدادات
- عرض معلومات الحساب
- تغيير كلمة المرور
- تسجيل الخروج

---

## التثبيت والتشغيل

### المتطلبات
- Node.js 18+
- npm أو yarn
- Expo CLI

### خطوات التشغيل

```bash
# الدخول لمجلد التطبيق
cd /app/mobile-app/supplier-app

# تثبيت المتطلبات
npm install

# تشغيل التطبيق (Expo Go)
npx expo start
```

### تشغيل على الجهاز
1. قم بتحميل تطبيق **Expo Go** من المتجر
2. امسح QR code من Terminal
3. سيفتح التطبيق على جهازك

---

## بناء التطبيق للنشر

### Android (APK)
```bash
# تثبيت EAS CLI
npm install -g eas-cli

# تسجيل الدخول في Expo
eas login

# بناء APK للاختبار
eas build --platform android --profile preview

# بناء للنشر على Google Play
eas build --platform android --profile production
```

### iOS
```bash
# بناء للنشر على App Store
eas build --platform ios --profile production
```

---

## API Endpoints

التطبيق يتصل بـ:
- `https://dairymanage-erp.preview.emergentagent.com/api`

### Endpoints المستخدمة:
- `POST /supplier-portal/login` - تسجيل الدخول
- `PUT /supplier-portal/change-password` - تغيير كلمة المرور
- `GET /supplier-portal/{id}/dashboard` - بيانات لوحة التحكم
- `GET /supplier-portal/{id}/supplies` - سجل التوريدات
- `POST /supplier-portal/feed-request` - طلب أعلاف
- `POST /supplier-portal/messages` - إرسال رسالة

---

## هيكل المشروع

```
supplier-app/
├── App.js                    # الملف الرئيسي
├── app.json                  # إعدادات Expo
├── src/
│   ├── context/
│   │   └── AuthContext.js    # إدارة المصادقة
│   ├── screens/
│   │   ├── LoginScreen.js    # شاشة تسجيل الدخول
│   │   ├── DashboardScreen.js # الشاشة الرئيسية
│   │   ├── FeedRequestScreen.js # طلب أعلاف
│   │   ├── SuppliesScreen.js  # سجل التوريدات
│   │   ├── MessagesScreen.js  # إرسال رسالة
│   │   └── SettingsScreen.js  # الإعدادات
│   └── services/
│       └── api.js            # إعدادات API
└── assets/                   # الصور والأيقونات
```

---

## بيانات الاختبار

- **كود المورد:** 1108
- **كلمة المرور:** 0000

---

## © 2026 المروج للألبان - جميع الحقوق محفوظة
