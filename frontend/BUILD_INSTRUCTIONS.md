# 📱 تعليمات بناء تطبيق APK - المروج للألبان

## ⚠️ ملاحظة مهمة
بناء APK يتطلب **Android Studio** الذي لا يمكن تثبيته على الخادم السحابي.
يجب تنفيذ هذه الخطوات على جهازك المحلي (Windows/Mac/Linux).

---

## 🔧 المتطلبات

### 1. تثبيت Android Studio
- حمّل من: https://developer.android.com/studio
- ثبّت وتأكد من تثبيت:
  - Android SDK
  - Android SDK Build-Tools
  - Android Emulator (اختياري)

### 2. تثبيت Node.js
- حمّل من: https://nodejs.org/
- الإصدار المطلوب: 18+

### 3. تثبيت Git
- حمّل من: https://git-scm.com/

---

## 📥 خطوات البناء

### الخطوة 1: تحميل المشروع
```bash
# استخدم "Save to GitHub" من منصة Emergent
# أو حمّل المشروع كـ ZIP
```

### الخطوة 2: تثبيت الاعتماديات
```bash
cd frontend
npm install
# أو
yarn install
```

### الخطوة 3: بناء تطبيق الويب
```bash
npm run build
# أو
yarn build
```

### الخطوة 4: مزامنة Capacitor
```bash
npx cap sync android
```

### الخطوة 5: فتح Android Studio
```bash
npx cap open android
```

### الخطوة 6: في Android Studio
1. انتظر حتى يكتمل **Gradle Sync**
2. من القائمة: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. انتظر حتى يكتمل البناء
4. اضغط على **locate** لإيجاد ملف APK

---

## 📁 موقع ملف APK
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔐 إعدادات الصلاحيات (مُعدة مسبقاً)

الصلاحيات التالية مُضافة في `AndroidManifest.xml`:
- ✅ `ACCESS_FINE_LOCATION` - الموقع الدقيق
- ✅ `ACCESS_COARSE_LOCATION` - الموقع التقريبي
- ✅ `ACCESS_BACKGROUND_LOCATION` - الموقع في الخلفية
- ✅ `FOREGROUND_SERVICE` - خدمة في المقدمة
- ✅ `FOREGROUND_SERVICE_LOCATION` - خدمة موقع
- ✅ `WAKE_LOCK` - منع السبات
- ✅ `POST_NOTIFICATIONS` - الإشعارات
- ✅ `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` - تجاهل تحسين البطارية

---

## 📲 تثبيت APK على الهاتف

### الطريقة 1: USB
1. فعّل **خيارات المطور** على الهاتف
2. فعّل **تصحيح USB**
3. وصّل الهاتف بالكمبيوتر
4. في Android Studio: Run > Run 'app'

### الطريقة 2: نقل الملف
1. انسخ `app-debug.apk` إلى الهاتف
2. افتح الملف من مدير الملفات
3. اسمح بتثبيت من مصادر غير معروفة
4. ثبّت التطبيق

---

## 🔄 تحديث التطبيق

عند إجراء تغييرات:
```bash
yarn build
npx cap sync android
# ثم أعد البناء من Android Studio
```

---

## 🛠️ حل المشاكل الشائعة

### خطأ: SDK location not found
```bash
# أضف ملف local.properties في مجلد android
echo "sdk.dir=/path/to/Android/Sdk" > android/local.properties
```

### خطأ: Gradle sync failed
- افتح Android Studio
- File > Invalidate Caches / Restart

### التطبيق لا يتتبع في الخلفية
- تأكد من إعطاء صلاحية "دائماً" للموقع
- أوقف تحسين البطارية للتطبيق

---

## 📞 الدعم

للمساعدة، تواصل مع فريق التطوير أو استخدم منصة Emergent.
