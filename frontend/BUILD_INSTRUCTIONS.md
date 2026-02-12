# تعليمات بناء تطبيق الموبايل - المروج للألبان

## المتطلبات

### للتطوير:
- Node.js v18+
- Android Studio (للـ Android)
- Xcode (للـ iOS - Mac فقط)

### الحزم المثبتة:
- @capacitor/core
- @capacitor/cli
- @capacitor/android
- @capacitor-community/background-geolocation

---

## خطوات البناء

### 1. تثبيت الاعتماديات
```bash
cd /app/frontend
yarn install
```

### 2. بناء تطبيق الويب
```bash
yarn build
```

### 3. إضافة منصة Android
```bash
npx cap add android
```

### 4. مزامنة الملفات
```bash
npx cap sync android
```

### 5. فتح المشروع في Android Studio
```bash
npx cap open android
```

---

## إعدادات Android للتتبع في الخلفية

### إضافة الصلاحيات في AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### إضافة الخدمة في AndroidManifest.xml (داخل <application>):
```xml
<service
    android:name="com.equimaps.capacitor_background_geolocation.BackgroundGeolocationService"
    android:enabled="true"
    android:exported="true"
    android:foregroundServiceType="location" />
```

---

## بناء APK للتثبيت

### Debug APK (للاختبار):
```bash
cd android
./gradlew assembleDebug
```
الملف الناتج: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (للإنتاج):
```bash
cd android
./gradlew assembleRelease
```

---

## تحديث التطبيق

بعد أي تغييرات في الكود:
```bash
yarn build
npx cap sync
```

---

## ملاحظات مهمة

1. **التتبع في الخلفية**: يعمل فقط على الجهاز الفعلي (ليس على المحاكي)
2. **الصلاحيات**: يجب على المستخدم السماح بـ "دائماً" لصلاحية الموقع
3. **البطارية**: التتبع المستمر يستهلك البطارية، يُنصح بتعديل فترة التحديث
4. **HTTPS**: التطبيق يتصل بالخادم عبر HTTPS فقط

---

## رابط التطبيق

- **تطبيق الويب (PWA)**: `/mobile-tracking`
- **تطبيق الموظف**: `/employee-app`

---

## الدعم الفني

للمساعدة في بناء التطبيق، تواصل مع فريق التطوير.
