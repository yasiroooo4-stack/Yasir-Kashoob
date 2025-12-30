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
  - قسم الموارد البشرية الشامل مع ربط جهاز البصمة ZKTeco
  - سجل النشاطات (Activity Logging) لجميع العمليات
  - قسم القانون (Legal) - العقود، القضايا، الاستشارات، المستندات
  - قسم المشاريع (Projects) - المشاريع، المهام، فرق العمل
  - قسم العمليات (Operations) - العمليات اليومية، المعدات، الصيانة، الحوادث، المركبات

backend:
  - task: "Auto-create collection centers on startup"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented and verified - 3 centers created (حجيف، زيك، غدو)"

  - task: "Activity Logging for all CRUD operations"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Added log_activity calls to 30+ CRUD operations"

  - task: "Legal Module APIs"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "APIs for contracts, cases, consultations, documents with dashboard"

  - task: "Projects Module APIs"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "APIs for projects, tasks, team members, milestones with dashboard"

  - task: "Operations Module APIs"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "APIs for daily operations, equipment, maintenance, incidents, vehicles with dashboard"

frontend:
  - task: "Legal Page"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/Legal.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Full page with 4 tabs: Contracts, Cases, Consultations, Documents"

  - task: "Projects Page"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/Projects.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Full page with 2 tabs: Projects, Tasks"

  - task: "Operations Page"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/Operations.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Full page with 5 tabs: Daily, Equipment, Maintenance, Incidents, Vehicles"

  - task: "Navigation Links for new modules"
    implemented: true
    working: true
    file: "/app/frontend/src/components/Layout.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Added Legal, Projects, Operations to sidebar with department-based permissions"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 4
  run_ui: true

test_plan:
  current_focus:
    - "Legal Module APIs"
    - "Projects Module APIs"
    - "Operations Module APIs"
  stuck_tasks: []
  test_all: false

agent_communication:
  - agent: "main"
    message: |
      تم إضافة 3 أقسام جديدة بنجاح:
      
      **1. قسم القانون (Legal):**
      - العقود القانونية (CRUD)
      - القضايا (CRUD + close)
      - الاستشارات القانونية (CRUD + respond)
      - المستندات القانونية (CRUD)
      - Dashboard مع إحصائيات
      
      **2. قسم المشاريع (Projects):**
      - المشاريع (CRUD + status update)
      - المهام (CRUD + complete)
      - أعضاء الفريق (CRUD)
      - المراحل (CRUD + achieve)
      - Dashboard مع إحصائيات والميزانية
      
      **3. قسم العمليات (Operations):**
      - العمليات اليومية (CRUD)
      - المعدات (CRUD + status)
      - سجلات الصيانة (CRUD)
      - تقارير الحوادث (CRUD + resolve)
      - أسطول المركبات (CRUD)
      - Dashboard مع إحصائيات
      
      **للاختبار:**
      - GET /api/legal/dashboard
      - GET /api/projects/dashboard/stats
      - GET /api/operations/dashboard
      - POST /api/legal/contracts
      - POST /api/projects
      - POST /api/operations/daily
      
      **بيانات الدخول:**
      - Username: yasir
      - Password: admin123