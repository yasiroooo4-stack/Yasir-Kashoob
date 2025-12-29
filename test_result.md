# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##
## agent_communication:
##     -agent: "main"
##     -message: "Your message here"

#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  نظام ERP كامل لمركز تجميع الحليب يتضمن:
  - مراكز تجميع متعددة (حجيف، زيك، غدو)
  - إدارة الموردين مع ربطهم بمراكز التجميع
  - صفحة إعدادات المستخدم
  - سجل النشاط
  - تصدير التقارير PDF/Excel

backend:
  - task: "Auto-create collection centers on startup"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented startup event to create 3 default centers (حجيف، زيك، غدو)"

  - task: "Collection Centers API endpoints"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/centers, POST, PUT, DELETE endpoints exist"

  - task: "User profile update API"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "PUT /api/auth/profile endpoint exists"

  - task: "Password change API"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "PUT /api/auth/password endpoint exists"

  - task: "Activity logs API"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/activity-logs endpoint exists, log_activity helper function created"

frontend:
  - task: "Settings page with profile, password, centers, activity tabs"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Settings.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Settings page with 4 tabs created and route added to App.js"

  - task: "Suppliers page with center selection"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Suppliers.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Center dropdown in supplier form"

  - task: "Navigation link to Settings"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/Layout.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Settings link added to sidebar navigation"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Auto-create collection centers on startup"
    - "Settings page with profile, password, centers, activity tabs"
    - "Suppliers page with center selection"
  stuck_tasks: []
  test_all: false

agent_communication:
  - agent: "main"
    message: |
      مرحباً testing agent! أرجو اختبار:
      1. التحقق من إنشاء مراكز التجميع الثلاثة تلقائياً (حجيف، زيك، غدو)
      2. اختبار صفحة الإعدادات:
         - تسجيل الدخول: username: testadmin, password: testpassword
         - الذهاب إلى /settings
         - التحقق من tabs الأربعة
         - التحقق من عرض المراكز في tab المراكز
      3. اختبار صفحة الموردين:
         - التحقق من ظهور dropdown لاختيار المركز
