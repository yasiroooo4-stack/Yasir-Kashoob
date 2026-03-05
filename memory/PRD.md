# Attendance Guard - PRD

## Original Problem Statement
Full-stack HR/Attendance management system (Arabic UI) with:
- Employee management, fingerprint attendance, GPS tracking
- Export Excel/PDF, manager approval workflow for GPS attendance
- Selfie capture on check-in/out, mock GPS detection
- WiFi-based attendance with company network verification
- Strict network validation (block non-company networks)
- Admin settings for WiFi/network configuration per location

## Architecture
- **Backend:** FastAPI + MongoDB (milk_erp database)
- **Frontend:** React + Shadcn UI + Tailwind CSS
- **Language:** Arabic (RTL), employee names always in Arabic

## What's Been Implemented
- [x] Employee list with Export Excel/PDF + date filters
- [x] Manager approval workflow for GPS attendance
- [x] GPS display bugs fixed in HR reports
- [x] Core logic: GPS + fingerprint merge on same day
- [x] Selfie capture (WebRTC) on check-in/out
- [x] Mock GPS detection + security logging
- [x] WiFi-based attendance flow
- [x] Admin WiFi config UI (SSID, BSSID, Password, IP, Gateway)
- [x] GPS approval reset in System Settings
- [x] **Strict network validation** - blocks non-company networks on /gps-attendance
- [x] **Simplified flow** - removed WiFi password step, direct Selfie + Check-in/out (Feb 2026)
- [x] **Bilingual support (Arabic/English)** - language toggle on /gps-attendance, localStorage persistence (Feb 2026)
- [x] **Auto GPS tracking** - GPS activates automatically after check-in, no button needed (Feb 2026)
- [x] **Range exit alerts** - instant alert when employee leaves work area + exit/return log with timestamps (Feb 2026)
- [x] **GPS columns in HR report** - added حضور GPS + انصراف GPS columns with approval status badges (Mar 2026)
- [x] **Fixed Invalid Date in map popup** - safe time formatting for "HH:MM" strings (Mar 2026)
- [x] **Bilingual map popups** - popup labels switch with language (Code/كود, Check-in/وقت الدخول, etc.) (Mar 2026)
- [x] **Exit log dashboard** - admin can view employee range exit/return logs with date filter + statistics (Mar 2026)
- [x] **Fixed source column** - WiFi/GPS attendance shows correct source badge instead of "يدوي" (Mar 2026)
- [x] **Fixed GPS columns in HR** - show time + approval + selfie for WiFi/GPS check-in/out (Mar 2026)
- [x] **Fixed check-out selfie** - selfie now saved as check_out_selfie_url (Mar 2026)
- [x] **Fixed employee tracking map** - changed default mode to 'attendance' (حاضر بالبصمة), fixed marker ID consistency (String), cleared markersRef on cleanup. Fingerprint employees now appear on map by default. (Mar 2026)

## Key Endpoints
- `GET /api/tracking/detect-network` - Auto IP verification
- `POST /api/tracking/gps-attendance` - Check-in/out with selfie
- `POST /api/tracking/employee-login` - Employee login
- `GET /api/tracking/settings` - Tracking settings with work locations

- `GET /api/tracking/range-exit-logs` - All employees' range exit logs for a date
- `GET /api/tracking/range-exit-logs/{employee_id}` - Specific employee's exit logs
- `POST /api/tracking/location` - UPDATED: now returns `range_event` (exit/return/null)
- Public IP: 85.154.168.39
- WiFi SSID: AL MOROOJ-2.4G
- Location: الادارة

## Prioritized Backlog
### P0
- [ ] Build native Android App (.apk) for reliable WiFi/BSSID detection

### P1
- [ ] SMS/QR Code for GPS attendance link distribution

### P2
- [ ] Supplier registration email/SMS notifications
- [ ] Enhanced location-based attendance reporting

### Refactoring
- [ ] Split server.py and tracking_routes.py into smaller modules
- [ ] Extract WiFi settings component from SystemSettings.jsx

## Test Credentials
- Username: hassan | Password: 123
- Test employee: EMP201802 (Said Mohammed Said Al Maamari)
