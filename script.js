import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, collection, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, Timestamp, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
// This must be consistent with the one you use for your Firebase project.
const firebaseConfig = {
    apiKey: "AIzaSyBu_MfB_JXvzBFaKY-Yxze1JotejU--4as",
    authDomain: "worktrackerapp-a32af.firebaseapp.com",
    projectId: "worktrackerapp-a32af",
    storageBucket: "worktrackerapp-a32af.firebasestorage.app",
    messagingSenderId: "246595598451",
    appId: "1:246595598451:web:c6842f1618dffe765a5206"
};

// Initialize Firebase App and Firestore Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async () => {
    // 1. DOM Elements
    // Page Containers
    const loginPage = document.getElementById('loginPage');
    const mainDashboard = document.getElementById('mainDashboard');
    const startWorkPage = document.getElementById('startWorkPage');
    const trackWorkPage = document.getElementById('trackWorkPage');
    const adminPanelPage = document.getElementById('adminPanelPage');

    // Login Page Elements
    const pinInput = document.getElementById('pinInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');

    // Main Dashboard Elements
    const userNameDisplay = document.getElementById('userNameDisplay');
    const totalHoursDisplay = document.getElementById('totalHoursDisplay');
    const totalBalanceDisplay = document.getElementById('totalBalanceDisplay'); // New: Total Balance Display
    const startWorkOptionBtn = document.getElementById('startWorkOption');
    const trackWorkOptionBtn = document.getElementById('trackWorkOption');
    const logoutDashboardBtn = document.getElementById('logoutDashboardBtn'); // Logout from main dashboard
    
    // Track Work Page Elements (now includes chart)
    const taskChartCanvas = document.getElementById('taskChart'); // Canvas for chart (now on track work page)
    let taskChart = null; // Chart.js instance for track work page
    const trackTasksTableBody = document.getElementById('trackTasksTableBody');
    const trackTasksTableFoot = document.getElementById('trackTasksTableFoot'); // New: Table footer for totals
    const backToDashboardFromTrackBtn = document.getElementById('backToDashboardFromTrack');

    // Start Work Page Elements
    const taskSelectionPopup = document.getElementById('taskSelectionPopup');
    const accountSelect = document.getElementById('accountSelect');
    const taskTypeSelect = document.getElementById('taskTypeSelect');
    const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');
    const backToDashboardFromPopup = document.getElementById('backToDashboardFromPopup'); // Back button in popup
    const completedTasksCount = document.getElementById('completedTasksCount');
    const recordedTotalTime = document.getElementById('recordedTotalTime');
    const detailedSummaryContainer = document.getElementById('detailedSummaryContainer'); // For detailed timing summary
    const taskTimingButtonsContainer = document.getElementById('taskTimingButtonsContainer'); // This is the div with class 'task-timing-buttons-section'
    const saveWorkBtn = document.getElementById('saveWorkBtn');
    const backToDashboardFromStartWork = document.getElementById('backToDashboardFromStartWork'); // Back button from start work page
    const taskDetailsContainer = document.getElementById('taskDetailsContainer'); // Reference to the container that holds summary and timing buttons

    // Admin Panel Elements - Users
    const newUserNameInput = document.getElementById('newUserNameInput');
    const newUserPINInput = document.getElementById('newUserPINInput');
    const addUserBtn = document.getElementById('addUserBtn');
    const usersTableBody = document.getElementById('usersTableBody');

    // Admin Panel Elements - Accounts
    const newAccountNameInput = document.getElementById('newAccountNameInput');
    const addAccountBtn = document.getElementById('addAccountBtn');
    const accountsTableBody = document.getElementById('accountsTableBody');

    // Admin Panel Elements - Task Definitions
    const newTaskNameInput = document.getElementById('newTaskNameInput');
    const newTimingsContainer = document.getElementById('newTimingsContainer');
    const addTimingFieldBtn = document.getElementById('addTimingFieldBtn');
    const addTaskDefinitionBtn = document.getElementById('addTaskDefinitionBtn');
    const tasksDefinitionTableBody = document.getElementById('tasksDefinitionTableBody');

    // Admin Panel Elements - Work Records
    const recordFilterDate = document.getElementById('recordFilterDate');
    const recordFilterUser = document.getElementById('recordFilterUser');
    const filterRecordsBtn = document.getElementById('filterRecordsBtn');
    const workRecordsTableBody = document.getElementById('workRecordsTableBody');

    // Edit Record Modal Elements
    const editRecordModal = document.getElementById('editRecordModal');
    const closeEditRecordModalBtn = editRecordModal.querySelector('.close-button');
    const editAccountSelect = document.getElementById('editAccountSelect');
    const editTaskTypeSelect = document.getElementById('editTaskTypeSelect');
    const editTotalTasksCount = document.getElementById('editTotalTasksCount');
    const editTotalTime = document.getElementById('editTotalTime');
    const editRecordDate = document.getElementById('editRecordDate'); // New: Date input for editing
    const editRecordTime = document.getElementById('editRecordTime'); // New: Time input for editing
    const saveEditedRecordBtn = document.getElementById('saveEditedRecordBtn');
    let currentEditingRecordId = null; // Stores the ID of the record being edited

    // Common Admin Elements
    const logoutAdminBtn = document.getElementById('logoutAdminBtn');

    // Toast Message Elements
    const toastMessage = document.getElementById('toastMessage');

    // Loading Indicator Elements
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Language Switcher Elements
    const langArBtn = document.getElementById('langArBtn');
    const langEnBtn = document.getElementById('langEnBtn');

    // Dark Mode Toggle Elements
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = darkModeToggle ? darkModeToggle.querySelector('i') : null;


    // 2. Global Variables
    let loggedInUser = null; // Stores current user data { id, name, role }
    let allAccounts = []; // Stores all account definitions from Firestore
    let allTaskDefinitions = []; // Stores all task definitions from Firestore
    let allUsers = []; // Stores all user definitions from Firestore (for admin panel and filters)
    let selectedAccount = null; // The account selected for the current work session
    let selectedTaskDefinition = null; // The task definition selected for the current work session
    let currentSessionTasks = []; // Tasks added in the current unsaved session
    let isSavingWork = false; // Flag to prevent beforeunload warning during save

    // Constants
    const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds (Changed from 3 hours)
    const HOURLY_RATE = 75; // EGP per hour

    // 3. Utility Functions

    // Function to get document data with ID
    const getDocData = (documentSnapshot) => {
        if (documentSnapshot.exists()) {
            return { id: documentSnapshot.id, ...documentSnapshot.data() };
        }
        return null;
    };

    // Function to show/hide pages
    const showPage = (pageElement) => {
        const pages = [loginPage, mainDashboard, startWorkPage, trackWorkPage, adminPanelPage];
        pages.forEach(p => p.style.display = 'none'); // Hide all pages
        pageElement.style.display = 'flex'; // Show the requested page (using flex for centering)

        // Hide popups/modals when changing main pages
        if (pageElement !== startWorkPage) {
            taskSelectionPopup.style.display = 'none';
        }
        editRecordModal.style.display = 'none'; // Ensure modal is hidden
    };

    // Function to show toast messages (notifications)
    const showToastMessage = (message, type) => {
        toastMessage.textContent = message;
        toastMessage.className = `toast-message ${type}`; // Add type class (success/error)
        toastMessage.style.display = 'block';
        // Force reflow to ensure CSS animation plays
        void toastMessage.offsetWidth;
        toastMessage.classList.add('show');

        setTimeout(() => {
            toastMessage.classList.remove('show');
            toastMessage.addEventListener('transitionend', function handler() {
                toastMessage.style.display = 'none';
                toastMessage.removeEventListener('transitionend', handler);
            }, { once: true });
        }, 3000); // Hide after 3 seconds
    };

    // Function to show/hide loading indicator
    const showLoadingIndicator = (show) => {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    };

    // Internet connection status check
    const checkConnectionStatus = () => {
        if (!navigator.onLine) {
            showToastMessage(getTranslatedText('noInternet'), 'error');
        }
    };

    // Dark Mode Functions
    const loadDarkModePreference = () => {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'enabled') {
            document.body.classList.add('dark-mode');
            updateDarkModeIcon(true);
        } else {
            updateDarkModeIcon(false); // Ensure correct icon if not dark mode
        }
    };

    const toggleDarkMode = () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
        updateDarkModeIcon(isDarkMode);
    };

    const updateDarkModeIcon = (isDarkMode) => {
        if (darkModeIcon) {
            if (isDarkMode) {
                darkModeIcon.classList.remove('fa-moon');
                darkModeIcon.classList.add('fa-sun'); // Sun icon for light mode
            } else {
                darkModeIcon.classList.remove('fa-sun');
                darkModeIcon.classList.add('fa-moon'); // Moon icon for dark mode
            }
        }
    };

    // Function to format decimal minutes (e.g., 9.2) to MM:SS (e.g., 9:12)
    const formatMinutesToMMSS = (decimalMinutes) => {
        if (isNaN(decimalMinutes) || decimalMinutes < 0) {
            return '00:00';
        }
        const minutes = Math.floor(decimalMinutes);
        const seconds = Math.round((decimalMinutes - minutes) * 60);
        
        // Handle cases where seconds might round up to 60
        if (seconds === 60) {
            return `${minutes + 1}:00`;
        }
        
        const formattedMinutes = String(minutes).padStart(1, '0'); // No need for 2 digits if single digit
        const formattedSeconds = String(seconds).padStart(2, '0');
        return `${formattedMinutes}:${formattedSeconds}`;
    };

    // Function to format total minutes into HH:MM:SS
    const formatTotalMinutesToHHMMSS = (totalMinutes) => {
        if (isNaN(totalMinutes) || totalMinutes < 0) {
            return '00:00:00';
        }
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        const seconds = Math.round((totalMinutes % 1) * 60); // Get seconds from the decimal part

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');

        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    };

    // Language Support
    const translations = {
        'ar': {
            'loginTitle': 'تسجيل الدخول',
            'pinPlaceholder': 'أدخل رمز PIN',
            'loginBtn': 'دخول',
            'pinError': 'الرجاء إدخال رمز PIN مكون من 8 أرقام فقط.',
            'pinIncorrect': 'رمز PIN غير صحيح. الرجاء المحاولة مرة أخرى.',
            'loginError': 'حدث خطأ أثناء تسجيل الدخول. الرجاء المحاولة لاحقاً.',
            'admin': 'المدير',
            'totalHoursTitle': 'إجمالي ساعات العمل:',
            'hoursUnit': 'ساعة',
            'totalBalanceTitle': 'إجمالي الرصيد:', // New translation
            'currencyUnit': 'جنيه', // New translation
            'startWorkOption': 'بدء العمل',
            'trackWorkOption': 'متابعة العمل',
            'chooseTask': 'اختر المهمة',
            'accountName': 'اسم الحساب:',
            'taskType': 'نوع المهمة:',
            'confirmBtn': 'تأكيد',
            'backToDashboard': 'رجوع للرئيسية',
            'selectAccountTask': 'الرجاء اختيار الحساب ونوع المهمة.',
            'taskCount': 'عدد المهام المنجزة:',
            'totalTimeRecorded': 'إجمالي الوقت المسجل:',
            'saveWorkBtn': 'حفظ العمل',
            'noTasksToSave': 'لم يتم تسجيل أي مهام لحفظها.',
            'confirmSave': 'هل أنت متأكد من حفظ العمل الحالي؟',
            'workSavedSuccess': 'تم حفظ العمل بنجاح!',
            'errorSavingWork': 'حدث خطأ أثناء حفظ العمل. الرجاء المحاولة مرة أخرى.',
            'unsavedTasksWarning': 'لديك مهام غير محفوظة. هل أنت متأكد من العودة؟ سيتم فقدان البيانات غير المحفوظة.',
            'trackWorkTitle': 'متابعة العمل',
            'serialColumn': 'المسلسل', // New translation
            'dateColumn': 'التاريخ', // Changed from dateAndTimeColumn
            'dailyTotalTimeColumn': 'إجمالي اليوم', // New translation
            'timingValueColumn': 'التوقيت (دقيقة)', // New translation
            'taskTimingsSummary': 'ملخص توقيتات المهمة', // New translation
            'totalForTaskColumn': 'إجمالي المهمة', // New translation
            'totalForAccountColumn': 'إجمالي الحساب', // New translation
            'taskColumn': 'المهمة', // Existing, but used differently
            'totalTimeMinutesColumn': 'إجمالي الوقت (دقيقة)', // Existing, but used differently
            'completedTasksColumn': 'عدد المهام المنجزة', // Existing, but used differently
            'noDataToShow': 'لا توجد بيانات لعرضها',
            'adminPanelTitle': 'لوحة تحكم المدير',
            'manageUsers': 'إدارة المستخدمين',
            'newUserName': 'اسم المستخدم الجديد',
            'newUserPIN': 'رمز PIN للمستخدم (8 أرقام)',
            'addUserBtn': 'إضافة مستخدم',
            'currentUsers': 'المستخدمون الحاليون:',
            'nameColumn': 'الاسم',
            'pinColumn': 'PIN',
            'actionsColumn': 'إجراءات',
            'deleteBtn': 'حذف',
            'confirmDeleteUser': 'هل أنت متأكد من حذف المستخدم {name}؟',
            'userDeletedSuccess': 'تم حذف المستخدم بنجاح.',
            'enterUserNamePin': 'الرجاء إدخال اسم مستخدم ورمز PIN مكون من 8 أرقام.',
            'pinAlreadyUsed': 'رمز PIN هذا مستخدم بالفعل. الرجاء اختيار رمز آخر.',
            'userAddedSuccess': 'تم إضافة المستخدم بنجاح!',
            'errorAddingUser': 'حدث خطأ أثناء إضافة المستخدم.',
            'manageAccounts': 'إدارة الحسابات',
            'newAccountName': 'اسم الحساب الجديد',
            'addAccountBtn': 'إضافة حساب',
            'currentAccounts': 'الحسابات الحالية:',
            'accountNameColumn': 'اسم الحساب',
            'confirmDeleteAccount': 'هل أنت متأكد من حذف الحساب {name}؟',
            'accountDeletedSuccess': 'تم حذف الحساب بنجاح.',
            'enterAccountName': 'الرجاء إدخال اسم الحساب.',
            'accountExists': 'اسم الحساب هذا موجود بالفعل. الرجاء اختيار اسم آخر.',
            'accountAddedSuccess': 'تم إضافة الحساب بنجاح!',
            'errorAddingAccount': 'حدث خطأ أثناء إضافة الحساب.',
            'manageTasks': 'إدارة المهام والتوقيتات',
            'newTaskName': 'اسم المهمة الجديدة',
            'timingPlaceholder': 'التوقيت (بالدقائق)',
            'addTimingField': 'إضافة حقل توقيت',
            'addTaskBtn': 'إضافة مهمة جديدة',
            'currentTasks': 'المهام الحالية:',
            'taskNameColumn': 'المهمة',
            'timingsColumn': 'التوقيتات (دقائق)',
            'confirmDeleteTask': 'هل أنت متأكد من حذف المهمة {name}؟',
            'taskDeletedSuccess': 'تم حذف المهمة بنجاح.',
            'enterTaskNameTiming': 'الرجاء إدخال اسم المهمة وتوقيت واحد على الأقل.',
            'taskExists': 'اسم المهمة هذا موجود بالفعل. الرجاء اختيار اسم آخر.',
            'taskAddedSuccess': 'تم إضافة المهمة بنجاح!',
            'errorAddingTask': 'حدث خطأ أثناء إضافة المهمة.',
            'logoutAdmin': 'تسجيل الخروج',
            'minutesUnit': 'دقيقة',
            'cancelSelection': 'إلغاء الاختيار',
            'undoLastAdd': 'إلغاء آخر إضافة',
            'noInternet': 'لا يوجد اتصال بالإنترنت. قد لا يتم حفظ البيانات.',
            'internetRestored': 'تم استعادة الاتصال بالإنترنت.',
            'internetLost': 'تم فقدان الاتصال بالإنترنت. يرجى التحقق من اتصالك.',
            'errorLoadingData': 'حدث خطأ في تحميل البيانات. الرجاء المحاولة مرة أخرى.',
            'manageWorkRecords': 'إدارة سجلات العمل',
            'allUsers': 'جميع المستخدمين',
            'filterBtn': 'تصفية',
            'noMatchingRecords': 'لا توجد سجلات عمل مطابقة.',
            'userColumn': 'المستخدم',
            'dateColumn': 'التاريخ',
            'timeColumn': 'الوقت', // New translation for time input
            'confirmDeleteRecord': 'هل أنت متأكد من حذف هذا السجل للمستخدم {name}؟',
            'recordDeletedSuccess': 'تم حذف السجل بنجاح.',
            'errorDeletingRecord': 'حدث خطأ أثناء حذف السجل.',
            'editRecord': 'العمل',
            'taskCountEdit': 'عدد المهام:',
            'totalTimeEdit': 'إجمالي الوقت (دقيقة):',
            'saveChangesBtn': 'حفظ التعديلات',
            'invalidEditData': 'الرجاء إدخال بيانات صحيحة لجميع الحقول.',
            'recordUpdatedSuccess': 'تم تحديث السجل بنجاح!',
            'errorUpdatingRecord': 'حدث خطأ أثناء تحديث السجل.',
            'sessionResumed': 'تم استئناف الجلسة السابقة.',
            'sessionResumeError': 'تعذر استئناف الجلسة. البيانات غير متناسقة.',
            'errorLoadingRecords': 'حدث خطأ أثناء تحميل سجلات العمل.',
            'notImplemented': 'هذه الميزة لم يتم تطبيقها بعد.',
            'hello': 'مرحباً، ',
            'taskDetailsByTiming': 'تفاصيل المهام حسب التوقيت:',
            'tasksTiming': 'مهام {timing} دقيقة: {count} مهمة (إجمالي {totalTime} دقيقة)',
            'grandTotal': 'الإجمالي الكلي', // New translation
            'totalTasksOverall': 'إجمالي عدد المهام', // New translation
            'totalTimeOverall': ' الوقت', // New translation
            'totalBalanceOverall': ' الرصيد', // New translation
            'sessionWarning': 'ستنتهي جلستك بعد ساعتين أو بعد ساعة من إغلاق المتصفح. هل ترغب في تسجيل الخروج الآن؟' // New translation for session warning
        },
        'en': {
            'loginTitle': 'Login',
            'pinPlaceholder': 'Enter PIN',
            'loginBtn': 'Login',
            'pinError': 'Please enter an 8-digit PIN only.',
            'pinIncorrect': 'Incorrect PIN. Please try again.',
            'loginError': 'An error occurred during login. Please try again later.',
            'admin': 'Admin',
            'totalHoursTitle': 'Total Work Hours:',
            'hoursUnit': 'hours',
            'totalBalanceTitle': 'Total Balance:', // New translation
            'currencyUnit': 'EGP', // New translation
            'startWorkOption': 'Start Work',
            'trackWorkOption': 'Track Work',
            'chooseTask': 'Select Task',
            'accountName': 'Account Name:',
            'taskType': 'Task Type:',
            'confirmBtn': 'Confirm',
            'backToDashboard': 'Back to Dashboard',
            'selectAccountTask': 'Please select both an account and a task type.',
            'taskCount': 'Completed Tasks:',
            'totalTimeRecorded': 'Total Recorded Time:',
            'saveWorkBtn': 'Save Work',
            'noTasksToSave': 'No tasks recorded to save.',
            'confirmSave': 'Are you sure you want to save the current work?',
            'workSavedSuccess': 'Work saved successfully!',
            'errorSavingWork': 'An error occurred while saving work. Please try again.',
            'unsavedTasksWarning': 'You have unsaved tasks. Are you sure you want to go back? Unsaved data will be lost.',
            'trackWorkTitle': 'Work Tracking',
            'serialColumn': 'Serial', // New translation
            'dateColumn': 'Date', // Changed from dateAndTimeColumn
            'dailyTotalTimeColumn': 'Daily Total Time', // New translation
            'timingValueColumn': 'Timing (minutes)', // New translation
            'taskTimingsSummary': 'Task Timings Summary', // New translation
            'totalForTaskColumn': 'Total for Task', // New translation
            'totalForAccountColumn': 'Total for Account', // New translation
            'taskColumn': 'Task', // Existing, but used differently
            'totalTimeMinutesColumn': 'Total Time (minutes)', // Existing, but used differently
            'completedTasksColumn': 'Completed Tasks', // Existing, but used differently
            'noDataToShow': 'No data to display',
            'adminPanelTitle': 'Admin Panel',
            'manageUsers': 'Manage Users',
            'newUserName': 'New User Name',
            'newUserPIN': 'User PIN (8 digits)',
            'addUserBtn': 'Add User',
            'currentUsers': 'Current Users:',
            'nameColumn': 'Name',
            'pinColumn': 'PIN',
            'actionsColumn': 'Actions',
            'deleteBtn': 'Delete',
            'confirmDeleteUser': 'Are you sure you want to delete user {name}?',
            'userDeletedSuccess': 'User deleted successfully.',
            'enterUserNamePin': 'Please enter a username and an 8-digit PIN.',
            'pinAlreadyUsed': 'This PIN is already in use. Please choose another.',
            'userAddedSuccess': 'User added successfully!',
            'errorAddingUser': 'An error occurred while adding the user.',
            'manageAccounts': 'Manage Accounts',
            'newAccountName': 'New Account Name',
            'addAccountBtn': 'Add Account',
            'currentAccounts': 'Current Accounts:',
            'accountNameColumn': 'Account Name',
            'confirmDeleteAccount': 'Are you sure you want to delete account {name}?',
            'accountDeletedSuccess': 'Account deleted successfully.',
            'enterAccountName': 'Please enter an account name.',
            'accountExists': 'This account name already exists. Please choose another.',
            'accountAddedSuccess': 'Account added successfully!',
            'errorAddingAccount': 'An error occurred while adding the account.',
            'manageTasks': 'Manage Tasks & Timings',
            'newTaskName': 'New Task Name',
            'timingPlaceholder': 'Timing (minutes)',
            'addTimingField': 'Add Timing Field',
            'addTaskBtn': 'Add New Task',
            'currentTasks': 'Current Tasks:',
            'taskNameColumn': 'Task',
            'timingsColumn': 'Timings (minutes)',
            'confirmDeleteTask': 'Are you sure you want to delete task {name}?',
            'taskDeletedSuccess': 'Task deleted successfully.',
            'enterTaskNameTiming': 'Please enter a task name and at least one timing.',
            'taskExists': 'This task name already exists. Please choose another.',
            'taskAddedSuccess': 'Task added successfully!',
            'errorAddingTask': 'An error occurred while adding the task.',
            'logoutAdmin': 'Logout',
            'minutesUnit': 'minutes',
            'cancelSelection': 'Cancel Selection',
            'undoLastAdd': 'Undo Last Add',
            'noInternet': 'No internet connection. Data might not be saved.',
            'internetRestored': 'Internet connection restored.',
            'internetLost': 'Internet connection lost. Please check your connection.',
            'errorLoadingData': 'An error occurred while loading data. Please try again.',
            'manageWorkRecords': 'Manage Work Records',
            'allUsers': 'All Users',
            'filterBtn': 'Filter',
            'noMatchingRecords': 'No matching work records.',
            'userColumn': 'User',
            'dateColumn': 'Date',
            'timeColumn': 'Time', // New translation for time input
            'confirmDeleteRecord': 'Are you sure you want to delete this record for user {name}?',
            'recordDeletedSuccess': 'Record deleted successfully.',
            'errorDeletingRecord': 'An error occurred while deleting the record.',
            'editRecord': 'Edit',
            'taskCountEdit': 'Task Count:',
            'totalTimeEdit': 'Total Time (minutes):',
            'saveChangesBtn': 'Save Changes',
            'invalidEditData': 'Please enter valid data for all fields.',
            'recordUpdatedSuccess': 'Record updated successfully!',
            'errorUpdatingRecord': 'An error occurred while updating the record.',
            'sessionResumed': 'Previous session resumed.',
            'sessionResumeError': 'Could not resume session. Data inconsistent.',
            'errorLoadingRecords': 'An error occurred while loading work records.',
            'notImplemented': 'This feature is not yet implemented.',
            'hello': 'Hi, ',
            'taskDetailsByTiming': 'Task Details by Timing:',
            'tasksTiming': '{count} tasks of {timing} minutes (Total {totalTime} minutes)',
            'grandTotal': 'Grand Total', // New translation
            'totalTasksOverall': 'Total Tasks Overall', // New translation
            'totalTimeOverall': 'Total Time Overall', // New translation
            'totalBalanceOverall': 'Total Balance Overall', // New translation
            'sessionWarning': 'Your session will expire in 2 hours or 1 hour after closing the browser. Do you want to log out now?' // New translation for session warning
        }
    };

    let currentLanguage = localStorage.getItem('appLanguage') || 'ar'; // Default to Arabic

    const setLanguage = (lang) => {
        currentLanguage = lang;
        localStorage.setItem('appLanguage', lang);
        applyTranslations();
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        
        // Re-render chart if it exists to update labels direction and colors
        if (taskChart) {
            taskChart.options.plugins.legend.rtl = (lang === 'ar');
            taskChart.options.plugins.tooltip.rtl = (lang === 'ar');
            // Update legend and title colors based on dark mode
            const isDarkMode = document.body.classList.contains('dark-mode');
            taskChart.options.plugins.legend.labels.color = isDarkMode ? '#e0e0e0' : '#333';
            taskChart.options.plugins.title.color = isDarkMode ? '#cadcff' : '#2c3e50';
            taskChart.update();
        }
    };

    const getTranslatedText = (key, params = {}) => {
        let text = translations[currentLanguage][key];
        if (text) {
            for (const param in params) {
                text = text.replace(`{${param}}`, params[param]);
            }
            return text;
        }
        return `[${key}]`; // Fallback for missing translation
    };

    const applyTranslations = () => {
        // Translate elements with data-key attribute
        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.getAttribute('data-key');
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = getTranslatedText(key);
            } else if (key === 'hello') {
                // Special handling for "Hello, [User Name]"
                element.childNodes[0].nodeValue = getTranslatedText(key);
            } else if (key === 'taskCount' || key === 'totalTimeRecorded' || key === 'totalHoursTitle' || key === 'totalBalanceTitle') {
                // Special handling for summary table labels and dashboard titles
                const spanElement = element.querySelector('span');
                if (spanElement) {
                    spanElement.textContent = getTranslatedText(key);
                } else {
                    element.textContent = getTranslatedText(key);
                }
            }
            else {
                element.textContent = getTranslatedText(key);
            }
        });

        // Specific elements that need manual translation or re-rendering
        // Update placeholder for dynamically added timing inputs
        const newTimingInputs = newTimingsContainer.querySelectorAll('.new-task-timing');
        newTimingInputs.forEach(input => {
            input.placeholder = getTranslatedText('timingPlaceholder');
        });

        // Update undo button text if they exist
        document.querySelectorAll('.undo-btn').forEach(btn => {
            btn.textContent = getTranslatedText('undoLastAdd');
        });

        // Re-render dynamic elements that contain text, like task timing buttons
        if (startWorkPage.style.display === 'flex' && taskSelectionPopup.style.display === 'none') {
             renderTaskTimingButtons(); // Re-render to update units
             updateWorkSummary(); // Re-render detailed summary
        }
        // Admin panel tables need re-rendering to update texts
        if (adminPanelPage.style.display === 'flex') {
            renderAdminPanel(); // This will call loadAndDisplay functions which re-render tables
        }
        // Re-render track work page to update headers and content
        if (trackWorkPage.style.display === 'flex') {
            renderTrackWorkPage();
        }
    };

    // 4. Session Management Functions
    const saveSession = (user) => {
        const sessionExpiry = Date.now() + SESSION_DURATION_MS;
        localStorage.setItem('loggedInUser', JSON.stringify(user));
        localStorage.setItem('sessionExpiry', sessionExpiry.toString());
    };

    const clearSession = () => {
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('sessionExpiry');
        loggedInUser = null; // Clear in-memory user data
    };

    const loadSession = async () => {
        const storedUser = localStorage.getItem('loggedInUser');
        const storedExpiry = localStorage.getItem('sessionExpiry');

        if (storedUser && storedExpiry && Date.now() < parseInt(storedExpiry)) {
            loggedInUser = JSON.parse(storedUser);
            // Fetch all static data once on session load
            await fetchAllStaticData();
            if (loggedInUser.id === 'admin') {
                showPage(adminPanelPage); // This will hide loginPage
                await renderAdminPanel(); // Ensure admin panel is rendered
            } else {
                showPage(mainDashboard); // This will hide loginPage
                await renderMainDashboard(); // Ensure main dashboard is rendered
            }
            return true; // Session resumed
        } else {
            clearSession(); // Clear expired or invalid session
            // loginPage is already visible by default in HTML, no need to call showPage(loginPage)
            return false; // No session or not resumed
        }
    };

    // Warn user before leaving if there are unsaved tasks
    window.addEventListener('beforeunload', (event) => {
        if (currentSessionTasks.length > 0 && !isSavingWork && loggedInUser && loggedInUser.id !== 'admin') {
            event.preventDefault();
            event.returnValue = ''; // Required for Chrome to show the prompt
            return ''; // Required for Firefox to show the prompt
        }
        // Optional: Add a general warning for session expiry if the user is logged in
        if (loggedInUser) {
            // This will show the browser's default "Are you sure you want to leave?" prompt.
            // Custom modals are not allowed here for security reasons.
            event.preventDefault();
            event.returnValue = getTranslatedText('sessionWarning');
            return getTranslatedText('sessionWarning');
        }
    });

    // New function to fetch all static data
    const fetchAllStaticData = async () => {
        showLoadingIndicator(true);
        try {
            // Fetch Users
            const usersCollectionRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);
            allUsers = usersSnapshot.docs.map(getDocData);

            // Fetch Accounts
            const accountsCollectionRef = collection(db, 'accounts');
            const accountsSnapshot = await getDocs(accountsCollectionRef);
            allAccounts = accountsSnapshot.docs.map(getDocData);

            // Fetch Task Definitions
            const tasksCollectionRef = collection(db, 'tasks');
            const tasksSnapshot = await getDocs(tasksCollectionRef);
            allTaskDefinitions = tasksSnapshot.docs.map(getDocData);

            console.log("All static data fetched and cached.");
        } catch (error) {
            console.error("Error fetching all static data:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    };

    // 5. Login Logic
    const handleLogin = async () => {
        const pin = pinInput.value.trim();
        loginError.style.display = 'none';

        if (pin.length !== 8 || isNaN(pin)) {
            loginError.textContent = getTranslatedText('pinError');
            loginError.style.display = 'block';
            return;
        }

        showLoadingIndicator(true);
        try {
            // Ensure adminPin document exists and retrieve its value
            const adminDocRef = doc(db, 'settings', 'adminPin'); // Use direct import 'doc'
            let adminPinValue = "12345678"; // Default admin PIN

            try {
                const adminDocSnapshot = await getDoc(adminDocRef); // Use direct import 'getDoc'
                
                // If the document exists, use its pin. Provide a fallback in case 'pin' field is missing.
                if (adminDocSnapshot.exists()) { 
                    adminPinValue = adminDocSnapshot.data().pin || adminPinValue;
                } else {
                    // If the document does not exist, create it with the default PIN
                    await setDoc(adminDocRef, { pin: adminPinValue }); // Use direct import 'setDoc'
                    console.log("Admin PIN document created with default PIN:", adminPinValue);
                }
            } catch (error) {
                console.error("Error fetching or creating admin PIN document:", error);
                // In case of an error accessing Firestore, we proceed with the default PIN.
                // The user will see a login error if the default PIN doesn't match their input.
            }

            // Fetch all static data immediately after successful login or session load
            await fetchAllStaticData();

            // Now use adminPinValue for comparison
            if (pin === adminPinValue) {
                loggedInUser = { id: 'admin', name: getTranslatedText('admin'), role: 'admin' };
                saveSession(loggedInUser); // Save admin session
                showPage(adminPanelPage);
                await renderAdminPanel(); // Call renderAdminPanel here after successful login
                pinInput.value = '';
                return;
            }

            const usersCollectionRef = collection(db, 'users'); // Use direct import 'collection'
            const userQueryRef = query(usersCollectionRef, where('pin', '==', pin), limit(1)); // Use direct imports 'query', 'where', 'limit'
            const userQuerySnapshot = await getDocs(userQueryRef); // Use direct import 'getDocs'

            if (!userQuerySnapshot.empty) {
                loggedInUser = getDocData(userQuerySnapshot.docs[0]);
                // Ensure user has a role, default to 'user' if not explicitly set
                if (!loggedInUser.role) {
                    loggedInUser.role = 'user';
                }
                saveSession(loggedInUser); // Save user session
                showPage(mainDashboard);
                await renderMainDashboard(); // Call renderMainDashboard here after successful login
                pinInput.value = '';
                return;
            }

            loginError.textContent = getTranslatedText('pinIncorrect');
            loginError.style.display = 'block';

        } catch (error) {
            console.error("Login error:", error);
            // Check if the error is due to network or permissions
            if (error.code === 'unavailable' || error.code === 'permission-denied') {
                showToastMessage(getTranslatedText('noInternet') + ' أو مشكلة في الصلاحيات.', 'error');
            } else {
                showToastMessage(getTranslatedText('loginError'), 'error');
            }
            loginError.textContent = getTranslatedText('loginError'); // Update login error message
            loginError.style.display = 'block';
        } finally {
            showLoadingIndicator(false);
        }
    };

    loginBtn.addEventListener('click', handleLogin);
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    // 6. Main Dashboard Logic
    const renderMainDashboard = async () => {
        if (!loggedInUser || loggedInUser.role === 'admin') {
            // If admin, they should not be on main dashboard, redirect to login or admin panel
            showPage(adminPanelPage); // Or loginPage if they are not truly admin
            return;
        }
        userNameDisplay.textContent = loggedInUser.name; // Display user name
        showLoadingIndicator(true);
        try {
            const userId = loggedInUser.id;
            const workRecordsCollectionRef = collection(db, 'workRecords'); // Use direct import 'collection'
            const recordsQueryRef = query(workRecordsCollectionRef, where('userId', '==', userId)); // Use direct import 'query', 'where'
            const recordsSnapshot = await getDocs(recordsQueryRef); // Use direct import 'getDocs'
            let totalHours = 0;
            
            if (!recordsSnapshot.empty) {
                recordsSnapshot.forEach(doc => {
                    const record = doc.data();
                    totalHours += record.totalTime / 60; // Convert minutes to hours
                });
            }

            const totalBalance = totalHours * HOURLY_RATE; // Calculate total balance

            totalHoursDisplay.textContent = totalHours.toFixed(2);
            totalBalanceDisplay.textContent = totalBalance.toFixed(2); // Display total balance

        } catch (error) {
            console.error("Error rendering dashboard:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    };

    startWorkOptionBtn.addEventListener('click', async () => {
        if (loggedInUser && loggedInUser.id !== 'admin') {
            showPage(startWorkPage);
            await initializeStartWorkPage();
            updateSaveButtonState(); // Initial state for save button
        }
    });

    trackWorkOptionBtn.addEventListener('click', async () => {
        if (loggedInUser && loggedInUser.id !== 'admin') {
            showPage(trackWorkPage);
            await renderTrackWorkPage(); // This will now also render the chart
        }
    });

    // Logout Buttons
    logoutDashboardBtn.addEventListener('click', () => {
        clearSession();
        showPage(loginPage);
        pinInput.value = '';
    });
    logoutAdminBtn.addEventListener('click', () => {
        clearSession();
        showPage(loginPage);
        pinInput.value = '';
    });

    // 7. Start Work Page Logic
    const fetchAccountsAndTasks = async () => {
        // Now using cached data from allAccounts and allTaskDefinitions
        // No need to fetch from Firestore again here
        // showLoadingIndicator(true); // Removed as data is already cached
        try {
            // Populate dropdowns from cached data
            accountSelect.innerHTML = `<option value="">${getTranslatedText('accountName')}</option>`;
            allAccounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.name;
                accountSelect.appendChild(option);
            });

            taskTypeSelect.innerHTML = `<option value="">${getTranslatedText('taskType')}</option>`;
            allTaskDefinitions.forEach(task => {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = task.name;
                taskTypeSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error populating accounts or tasks from cache:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        } finally {
            // showLoadingIndicator(false); // Removed
        }
    };

    const initializeStartWorkPage = async () => {
        currentSessionTasks = [];
        completedTasksCount.textContent = '0';
        recordedTotalTime.textContent = '00:00'; // Initial display formatted
        detailedSummaryContainer.innerHTML = ''; // Clear detailed summary
        taskTimingButtonsContainer.innerHTML = '';
        selectedAccount = null;
        selectedTaskDefinition = null;
        taskDetailsContainer.style.display = 'none'; // Hide details until confirmed
        taskSelectionPopup.style.display = 'flex'; // Show popup for selection (using flex)
        accountSelect.value = "";
        taskTypeSelect.value = "";
        await fetchAccountsAndTasks(); // This now uses cached data
    };

    confirmSelectionBtn.addEventListener('click', () => {
        const accountId = accountSelect.value;
        const taskDefinitionId = taskTypeSelect.value;

        if (!accountId || !taskDefinitionId) {
            alert(getTranslatedText('selectAccountTask'));
            return;
        }

        selectedAccount = allAccounts.find(acc => acc.id === accountId);
        selectedTaskDefinition = allTaskDefinitions.find(task => task.id === taskDefinitionId);

        if (selectedAccount && selectedTaskDefinition) {
            taskSelectionPopup.style.display = 'none';
            taskDetailsContainer.style.display = 'block'; // Show details container
            renderTaskTimingButtons();
            updateWorkSummary(); // Initialize summary display
        } else {
            alert(getTranslatedText('errorLoadingData')); // Should not happen if dropdowns are populated correctly
        }
    });

    // Event listener for the new "Back" button in the task selection popup
    backToDashboardFromPopup.addEventListener('click', () => {
        if (currentSessionTasks.length > 0 && !confirm(getTranslatedText('unsavedTasksWarning'))) {
            return;
        }
        currentSessionTasks = []; // Clear tasks if user goes back without saving
        showPage(mainDashboard);
    });

    const renderTaskTimingButtons = () => {
        taskTimingButtonsContainer.innerHTML = '';
        if (selectedTaskDefinition && selectedTaskDefinition.timings && selectedTaskDefinition.timings.length > 0) {
            selectedTaskDefinition.timings.forEach((timingValue) => {
                const wrapper = document.createElement('div');
                wrapper.classList.add('timing-button-wrapper');
                // Ensure wrapper has relative positioning for absolute child
                wrapper.style.position = 'relative'; 

                const button = document.createElement('button');
                button.classList.add('task-timing-btn');
                button.textContent = `${formatMinutesToMMSS(timingValue)}`; // Use formatted time
                button.dataset.timing = timingValue;
                button.addEventListener('click', () => {
                    currentSessionTasks.push({
                        accountId: selectedAccount.id,
                        accountName: selectedAccount.name,
                        taskId: selectedTaskDefinition.id,
                        taskName: selectedTaskDefinition.name,
                        timing: parseFloat(timingValue),
                        timestamp: Date.now() // Use client-side timestamp for session
                    });
                    updateWorkSummary();
                    // Show undo button for this specific timing
                    wrapper.querySelector('.undo-btn').classList.add('show');
                });
                wrapper.appendChild(button);

                const undoButton = document.createElement('button');
                undoButton.classList.add('undo-btn');
                undoButton.textContent = getTranslatedText('undoLastAdd');
                // Initially hidden by CSS classes, will be shown with .show class
                undoButton.addEventListener('click', () => {
                    // Find and remove the last added task of this specific timing
                    const indexToRemove = currentSessionTasks.map(task => task.timing).lastIndexOf(parseFloat(timingValue));
                    if (indexToRemove > -1) {
                        currentSessionTasks.splice(indexToRemove, 1); // Remove only one instance
                        updateWorkSummary();
                    }
                    // Hide undo button if no more tasks of this timing exist
                    const countOfThisTiming = currentSessionTasks.filter(task => task.timing === parseFloat(timingValue)).length;
                    if (countOfThisTiming === 0) {
                        undoButton.classList.remove('show');
                    }
                });
                wrapper.appendChild(undoButton);
                taskTimingButtonsContainer.appendChild(wrapper);
            });
        } else {
             taskTimingButtonsContainer.innerHTML = `<p style="text-align: center; color: #888;">${getTranslatedText('noDataToShow')}</p>`;
        }
    };

    const updateWorkSummary = () => {
        let totalCount = 0;
        let totalTime = 0;
        
        // Group tasks by timing for detailed summary
        const timingSummary = {};
        
        currentSessionTasks.forEach(task => {
            const timingKey = task.timing.toFixed(1); // Use fixed decimal for key consistency
            if (!timingSummary[timingKey]) {
                timingSummary[timingKey] = { count: 0, totalTime: 0 };
            }
            timingSummary[timingKey].count++;
            timingSummary[timingKey].totalTime += task.timing;
            totalCount++; // Global count
            totalTime += task.timing; // Global total time
        });

        completedTasksCount.textContent = totalCount;
        recordedTotalTime.textContent = formatMinutesToMMSS(totalTime); // Use formatted time

        detailedSummaryContainer.innerHTML = ''; // Clear previous content

        // Display detailed summary for each timing
        if (Object.keys(timingSummary).length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = getTranslatedText('taskDetailsByTiming');
            detailedSummaryContainer.appendChild(heading);
            
            // Sort timings for consistent display
            const sortedTimings = Object.keys(timingSummary).sort((a, b) => parseFloat(a) - parseFloat(b));

            sortedTimings.forEach(timing => {
                const summary = timingSummary[timing];
                const p = document.createElement('p');
                p.textContent = getTranslatedText('tasksTiming', {
                    timing: formatMinutesToMMSS(parseFloat(timing)), // Use formatted time
                    count: summary.count,
                    totalTime: formatMinutesToMMSS(summary.totalTime) // Use formatted time
                });
                detailedSummaryContainer.appendChild(p);
            });
        }
        updateSaveButtonState(); // Update save button state
    };

    const updateSaveButtonState = () => {
        saveWorkBtn.disabled = currentSessionTasks.length === 0;
        if (currentSessionTasks.length === 0) {
            saveWorkBtn.classList.add('disabled');
        } else {
            saveWorkBtn.classList.remove('disabled');
        }
    };

    saveWorkBtn.addEventListener('click', async () => {
        if (currentSessionTasks.length === 0) {
            alert(getTranslatedText('noTasksToSave'));
            return;
        }

        if (!confirm(getTranslatedText('confirmSave'))) {
            return;
        }

        isSavingWork = true; // Set flag to true before saving
        showLoadingIndicator(true);

        try {
            const recordData = {
                userId: loggedInUser.id,
                userName: loggedInUser.name,
                accountId: selectedAccount.id,
                accountName: selectedAccount.name,
                taskDefinitionId: selectedTaskDefinition.id,
                taskDefinitionName: selectedTaskDefinition.name,
                recordedTimings: currentSessionTasks.map(t => ({
                    timing: t.timing,
                    timestamp: t.timestamp
                })),
                totalTasksCount: currentSessionTasks.length, // Total count of tasks in this record
                totalTime: currentSessionTasks.reduce((sum, task) => sum + task.timing, 0), // Total time for this record
                timestamp: serverTimestamp() // Use direct import serverTimestamp
            };

            await addDoc(collection(db, 'workRecords'), recordData); // Use direct imports addDoc, collection
            showToastMessage(getTranslatedText('workSavedSuccess'), 'success');
            currentSessionTasks = [];
            isSavingWork = false; // Reset flag
            showPage(mainDashboard);
            await renderMainDashboard();
        } catch (error) {
            console.error("Error saving work:", error);
            showToastMessage(getTranslatedText('errorSavingWork'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    });

    // Back button from Start Work Page
    backToDashboardFromStartWork.addEventListener('click', () => {
        if (currentSessionTasks.length > 0 && !confirm(getTranslatedText('unsavedTasksWarning'))) {
            return;
        }
        currentSessionTasks = []; // Clear tasks if user abandons it
        showPage(mainDashboard);
    });

    // 8. Track Work Page Logic
    const renderTrackWorkPage = async () => {
        if (!loggedInUser || loggedInUser.id === 'admin') {
            showPage(loginPage);
            return;
        }
        trackTasksTableBody.innerHTML = '';
        trackTasksTableFoot.innerHTML = ''; // Clear footer
        showLoadingIndicator(true);
        try {
            const userId = loggedInUser.id;
            const workRecordsCollectionRef = collection(db, 'workRecords'); // Use direct import collection
            const recordsQueryRef = query(workRecordsCollectionRef, where('userId', '==', userId), orderBy('timestamp', 'desc')); // Use direct imports query, where, orderBy
            const recordsSnapshot = await getDocs(recordsQueryRef); // Use direct import getDocs

            if (recordsSnapshot.empty) {
                const row = trackTasksTableBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 10; // Adjusted colspan for new table structure (was 9)
                cell.textContent = getTranslatedText('noDataToShow');
                cell.style.textAlign = 'center';
                showLoadingIndicator(false);
                // Destroy chart if no data
                if (taskChart) {
                    taskChart.destroy();
                    taskChart = null;
                }
                return;
            }

            // Data processing for the complex table
            const processedData = {};
            let grandTotalTasks = 0;
            let grandTotalTime = 0;
            let chartDataForUser = {}; // For the chart on this page

            recordsSnapshot.forEach(documentSnapshot => { // Changed param name to documentSnapshot for clarity
                const record = documentSnapshot.data();
                // Ensure timestamp is a Date object before formatting
                const recordDateObj = record.timestamp ? new Date(record.timestamp.toDate()) : new Date();
                const recordDate = recordDateObj.toLocaleDateString('en-CA'); // ISO 8601 format (YYYY-MM-DD) for consistent grouping

                if (!processedData[recordDate]) {
                    processedData[recordDate] = { accounts: {}, dateTotalTasks: 0, dateTotalTime: 0, totalRows: 0 };
                }
                if (!processedData[recordDate].accounts[record.accountId]) {
                    processedData[recordDate].accounts[record.accountId] = { name: record.accountName, tasks: {}, accountTotalTasks: 0, accountTotalTime: 0, totalRows: 0 };
                }
                // Group by taskDefinitionId, but also include the specific record's time for display
                // Use documentSnapshot.id for a truly unique key for each record to avoid merging different records of the same task type
                const taskRecordKey = documentSnapshot.id; 
                if (!processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey]) {
                    processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey] = {
                        name: record.taskDefinitionName,
                        timings: {},
                        taskTotalTasks: 0,
                        taskTotalTime: 0,
                        totalRows: 0 // To calculate rowspan for the task
                    };
                }

                record.recordedTimings.forEach(rt => {
                    const timingKey = rt.timing.toFixed(1); // Use fixed decimal for key consistency
                    if (!processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].timings[timingKey]) {
                        processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].timings[timingKey] = { count: 0, totalTime: 0 };
                    }
                    processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].timings[timingKey].count++;
                    processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].timings[timingKey].totalTime += rt.timing;

                    // Aggregate for chart
                    chartDataForUser[record.taskDefinitionName] = (chartDataForUser[record.taskDefinitionName] || 0) + rt.timing;
                });

                // Update totals for the specific record
                processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].taskTotalTasks += record.totalTasksCount;
                processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].taskTotalTime += record.totalTime;

                // Calculate totalRows for task
                const currentTaskTimingsCount = Object.keys(processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].timings).length;
                processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].totalRows = currentTaskTimingsCount > 0 ? currentTaskTimingsCount : 1;


                // Update totals for account and date
                processedData[recordDate].accounts[record.accountId].accountTotalTasks += record.totalTasksCount;
                processedData[recordDate].accounts[record.accountId].accountTotalTime += record.totalTime;

                processedData[recordDate].dateTotalTasks += record.totalTasksCount;
                processedData[recordDate].dateTotalTime += record.totalTime;

                grandTotalTasks += record.totalTasksCount;
                grandTotalTime += record.totalTime;
            });

            // Second pass to calculate totalRows for accounts and dates
            for (const dateKey in processedData) {
                const dateData = processedData[dateKey];
                dateData.totalRows = 0;
                for (const accountId in dateData.accounts) {
                    const accountData = dateData.accounts[accountId];
                    accountData.totalRows = 0;
                    for (const taskRecordKey in accountData.tasks) {
                        const taskData = accountData.tasks[taskRecordKey];
                        accountData.totalRows += taskData.totalRows;
                    }
                    dateData.totalRows += accountData.totalRows;
                }
            }


            // Render Chart
            if (taskChart) {
                taskChart.destroy(); // Destroy existing chart before creating a new one
            }

            const chartLabels = Object.keys(chartDataForUser);
            const chartDataValues = Object.values(chartDataForUser);

            const isDarkMode = document.body.classList.contains('dark-mode');
            const legendTextColor = isDarkMode ? '#e0e0e0' : '#333';
            const titleTextColor = isDarkMode ? '#cadcff' : '#2c3e50';

            taskChart = new Chart(taskChartCanvas, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartDataValues,
                        backgroundColor: [
                            '#007bff', '#28a745', '#ffc107', '#17a2b8', '#dc3545', '#6c757d', '#fd7e14', '#663399', '#ff6384', '#36a2eb'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Allow chart to resize freely
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: legendTextColor // Adjust legend text color for dark mode
                            },
                            rtl: (currentLanguage === 'ar') // Set RTL for legend
                        },
                        title: {
                            display: true,
                            text: getTranslatedText('totalTimeRecorded'), // Use translated title
                            color: titleTextColor // Adjust title text color for dark mode
                        },
                        tooltip: {
                            rtl: (currentLanguage === 'ar') // Set RTL for tooltips
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    }
                }
            });


            // Render Table
            let serialCounter = 1;
            const sortedDates = Object.keys(processedData).sort((a, b) => new Date(b) - new Date(a)); // Sort dates descending

            for (const dateKey of sortedDates) {
                const dateData = processedData[dateKey];
                const sortedAccountIds = Object.keys(dateData.accounts).sort(); // Sort accounts alphabetically

                let dateRowSpanHandled = false; // Flag to ensure date/daily total cell is added only once per date group

                for (const accountId of sortedAccountIds) {
                    const accountData = dateData.accounts[accountId];
                    const sortedTaskRecordKeys = Object.keys(accountData.tasks).sort((a, b) => {
                        const taskA = accountData.tasks[a];
                        const taskB = accountData.tasks[b];
                        if (taskA.name !== taskB.name) {
                            return taskA.name.localeCompare(taskB.name, currentLanguage);
                        }
                        // No time to compare, so just compare task names
                        return taskA.name.localeCompare(taskB.name, currentLanguage);
                    });
                    let accountRowSpanHandled = false; // Flag to ensure account name and total for account cells are added only once per account group

                    for (const taskRecordKey of sortedTaskRecordKeys) {
                        const taskData = accountData.tasks[taskRecordKey];
                        const sortedTimings = Object.keys(taskData.timings).sort((a, b) => parseFloat(a) - parseFloat(b));
                        const timingsCount = sortedTimings.length;
                        const actualTaskRows = timingsCount > 0 ? timingsCount : 1; // At least one row for task

                        let taskRowSpanHandled = false; // Flag to ensure task name and total for task cells are added only once per task record

                        for (let i = 0; i < actualTaskRows; i++) {
                            const row = trackTasksTableBody.insertRow();
                            // Add a class to the row for styling the border
                            row.classList.add('daily-record-row');

                            // Column 1: Serial Number (per account)
                            if (!accountRowSpanHandled) {
                                const cell = row.insertCell();
                                cell.textContent = serialCounter++; // Increment serial per account
                                cell.rowSpan = accountData.totalRows;
                                cell.classList.add('total-cell');
                            }

                            // Column 2: Date (per date) - Removed time
                            if (!dateRowSpanHandled) {
                                const cell = row.insertCell();
                                cell.textContent = new Date(dateKey).toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US');
                                cell.rowSpan = dateData.totalRows;
                                cell.classList.add('total-cell', 'date-cell'); // Add date-cell class
                            }

                            // Column 3: Account Name (per account)
                            if (!accountRowSpanHandled) {
                                const cell = row.insertCell();
                                cell.textContent = accountData.name;
                                cell.rowSpan = accountData.totalRows;
                                cell.classList.add('total-cell');
                            }

                            // Column 4: Task Name (per task record)
                            if (!taskRowSpanHandled) {
                                const cell = row.insertCell();
                                cell.textContent = taskData.name;
                                cell.rowSpan = actualTaskRows;
                            }

                            // Column 5: Timing Value (per timing)
                            const timingValueCell = row.insertCell();
                            const currentTiming = timingsCount > 0 ? taskData.timings[sortedTimings[i]] : null;
                            if (currentTiming) {
                                timingValueCell.textContent = formatMinutesToMMSS(parseFloat(sortedTimings[i]));
                            } else {
                                timingValueCell.textContent = '00:00';
                            }

                            // Column 6: Completed Tasks (per timing)
                            const completedTasksCell = row.insertCell();
                            if (currentTiming) {
                                completedTasksCell.textContent = currentTiming.count;
                            } else {
                                completedTasksCell.textContent = '0';
                            }

                            // Column 7: Total Time (per timing)
                            const totalTimeCell = row.insertCell();
                            if (currentTiming) {
                                totalTimeCell.textContent = formatMinutesToMMSS(currentTiming.totalTime);
                            } else {
                                totalTimeCell.textContent = '00:00';
                            }

                            // Column 8: Total for Task (per task record)
                            if (!taskRowSpanHandled) {
                                const cell = row.insertCell();
                                cell.textContent = formatMinutesToMMSS(taskData.taskTotalTime);
                                cell.rowSpan = actualTaskRows;
                                cell.classList.add('total-cell');
                            }

                            // Column 9: Total for Account (per account)
                            if (!accountRowSpanHandled) {
                                const cell = row.insertCell();
                                cell.textContent = formatMinutesToMMSS(accountData.accountTotalTime);
                                cell.rowSpan = accountData.totalRows;
                                cell.classList.add('total-cell');
                            }

                            // Column 10: Daily Total Time (per date) - New column
                            if (!dateRowSpanHandled) {
                                const cell = row.insertCell();
                                cell.textContent = formatMinutesToMMSS(dateData.dateTotalTime); // Display daily total
                                cell.rowSpan = dateData.totalRows;
                                cell.classList.add('total-cell', 'daily-total-cell'); // Add daily-total-cell class
                            }

                            // Update flags
                            if (!dateRowSpanHandled) {
                                dateRowSpanHandled = true;
                            }
                            if (!accountRowSpanHandled) {
                                accountRowSpanHandled = true;
                            }
                            if (!taskRowSpanHandled) {
                                taskRowSpanHandled = true;
                            }
                        }
                    }
                }
            }

            // Render Footer (Grand Totals)
            const footerRow = trackTasksTableFoot.insertRow();
            
            // Grand Total label
            let cell = footerRow.insertCell();
            cell.colSpan = 5; // Adjusted colspan for new column
            cell.textContent = getTranslatedText('grandTotal');
            cell.classList.add('grand-total-label');

            // Total Tasks Overall label
            cell = footerRow.insertCell();
            cell.colSpan = 2; // Span across Timing Value, Completed Tasks
            cell.textContent = getTranslatedText('totalTasksOverall');
            cell.classList.add('grand-total-label');

            // Total Tasks Overall value
            cell = footerRow.insertCell();
            cell.textContent = grandTotalTasks;
            cell.classList.add('grand-total-value');

            // Total Time Overall label
            cell = footerRow.insertCell();
            cell.textContent = getTranslatedText('totalTimeOverall');
            cell.classList.add('grand-total-label');

            // Total Time Overall value - This will now correctly align under 'Total for Account'
            cell = footerRow.insertCell();
            // Display in MM:SS / HH:MM:SS format
            cell.textContent = `${formatMinutesToMMSS(grandTotalTime)} / ${formatTotalMinutesToHHMMSS(grandTotalTime)}`;
            cell.classList.add('grand-total-value');

            // Total Balance Overall (new row for balance)
            const balanceRow = trackTasksTableFoot.insertRow();
            cell = balanceRow.insertCell();
            cell.colSpan = 7; // Adjusted colspan for new column
            cell.textContent = getTranslatedText('totalBalanceOverall');
            cell.classList.add('grand-total-label');

            cell = balanceRow.insertCell();
            cell.colSpan = 3; // Adjusted colspan for new column
            cell.textContent = `${(grandTotalTime / 60 * HOURLY_RATE).toFixed(2)} ${getTranslatedText('currencyUnit')}`;
            cell.classList.add('grand-total-value');

            // Apply styling to grand total cells
            Array.from(trackTasksTableFoot.rows).forEach(row => {
                Array.from(row.cells).forEach(c => {
                    c.style.fontWeight = 'bold';
                    // Use CSS classes for background and border for dark mode compatibility
                    c.classList.add('grand-total-footer-cell'); 
                });
            });


        } catch (error) {
            console.error("Error rendering track work page:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    };

    backToDashboardFromTrackBtn.addEventListener('click', () => {
        showPage(mainDashboard);
    });

    // 9. Admin Panel Logic
    const renderAdminPanel = async () => {
        if (!loggedInUser || loggedInUser.id !== 'admin') {
            showPage(loginPage);
            return;
        }
        showLoadingIndicator(true); // Start loading indicator for admin panel
        try {
            // These functions now use cached data
            await loadAndDisplayUsers();
            await loadAndDisplayAccounts();
            await loadAndDisplayTaskDefinitions();
            await populateUserFilter(); // Populate user filter dropdown
            recordFilterDate.valueAsDate = new Date(); // Set default date to today
            await loadAndDisplayWorkRecords(null, recordFilterDate.value); // Load all records initially for today
        } catch (error) {
            console.error("Error rendering admin panel:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        } finally {
            showLoadingIndicator(false); // Hide loading indicator after all admin data is loaded
        }
    };

    // Admin: Manage Users
    const loadAndDisplayUsers = async () => {
        usersTableBody.innerHTML = '';
        try {
            // Use cached allUsers data
            console.log("Users fetched for admin panel (from cache):", allUsers.length); // Debug log
            if (allUsers.length === 0) {
                const row = usersTableBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 3;
                cell.textContent = getTranslatedText('noDataToShow');
                cell.style.textAlign = 'center';
            } else {
                allUsers.forEach(user => { // Iterate over cached users
                    console.log("Processing user for admin panel:", user.name); // Debug log for each user
                    const row = usersTableBody.insertRow();
                    row.insertCell().textContent = user.name;
                    row.insertCell().textContent = user.pin;
                    const actionCell = row.insertCell();
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = getTranslatedText('deleteBtn');
                    deleteBtn.classList.add('admin-action-btn', 'delete');
                    deleteBtn.addEventListener('click', async () => {
                        // Prevent deleting admin user from UI
                        if (user.role === 'admin') {
                            alert(getTranslatedText('notImplemented')); // Or a specific message like 'Cannot delete admin user'
                            return;
                        }
                        if (confirm(getTranslatedText('confirmDeleteUser', { name: user.name }))) {
                            showLoadingIndicator(true);
                            try {
                                await deleteDoc(doc(db, 'users', user.id)); // Use direct imports deleteDoc, doc
                                showToastMessage(getTranslatedText('userDeletedSuccess'), 'success');
                                await fetchAllStaticData(); // Re-fetch all static data after deletion
                                await loadAndDisplayUsers(); // Reload after delete
                            } catch (err) {
                                console.error("Error deleting user:", err);
                                showToastMessage(getTranslatedText('errorAddingUser'), 'error'); // Reusing translation key
                            } finally {
                                showLoadingIndicator(false);
                            }
                        }
                    });
                    actionCell.appendChild(deleteBtn);
                });
            }
        } catch (error) {
            console.error("Error loading users:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        }
    };

    addUserBtn.addEventListener('click', async () => {
        const name = newUserNameInput.value.trim();
        const pin = newUserPINInput.value.trim();

        if (!name || pin.length !== 8 || isNaN(pin)) {
            alert(getTranslatedText('enterUserNamePin'));
            return;
        }
        showLoadingIndicator(true);
        try {
            const usersCollectionRef = collection(db, 'users'); // Use direct import collection
            const existingUserQueryRef = query(usersCollectionRef, where('pin', '==', pin), limit(1)); // Use direct imports query, where, limit
            const existingUserSnapshot = await getDocs(existingUserQueryRef); // Use direct import getDocs
            if (!existingUserSnapshot.empty) {
                alert(getTranslatedText('pinAlreadyUsed'));
                showLoadingIndicator(false);
                return;
            }

            await addDoc(usersCollectionRef, { name: name, pin: pin, role: 'user' }); // Use direct import addDoc
            showToastMessage(getTranslatedText('userAddedSuccess'), 'success');
            newUserNameInput.value = '';
            newUserPINInput.value = '';
            await fetchAllStaticData(); // Re-fetch all static data after adding
            await loadAndDisplayUsers();
            await populateUserFilter(); // Re-populate user filter after adding a new user
        } catch (error) {
            console.error("Error adding user:", error);
            showToastMessage(getTranslatedText('errorAddingUser'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    });

    // Admin: Manage Accounts
    const loadAndDisplayAccounts = async () => {
        accountsTableBody.innerHTML = '';
        try {
            // Use cached allAccounts data
            console.log("Accounts fetched for admin panel (from cache):", allAccounts.length); // Debug log
            if (allAccounts.length === 0) {
                const row = accountsTableBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 2;
                cell.textContent = getTranslatedText('noDataToShow');
                cell.style.textAlign = 'center';
            } else {
                allAccounts.forEach(account => { // Iterate over cached accounts
                    console.log("Processing account for admin panel:", account.name); // Debug log
                    const row = accountsTableBody.insertRow();
                    row.insertCell().textContent = account.name;
                    const actionCell = row.insertCell();
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = getTranslatedText('deleteBtn');
                    deleteBtn.classList.add('admin-action-btn', 'delete');
                    deleteBtn.addEventListener('click', async () => {
                        if (confirm(getTranslatedText('confirmDeleteAccount', { name: account.name }))) {
                            showLoadingIndicator(true);
                            try {
                                await deleteDoc(doc(db, 'accounts', account.id)); // Use direct imports deleteDoc, doc
                                showToastMessage(getTranslatedText('accountDeletedSuccess'), 'success');
                                await fetchAllStaticData(); // Re-fetch all static data after deletion
                                await loadAndDisplayAccounts(); // Reload after delete
                            } catch (err) {
                                console.error("Error deleting account:", err);
                                showToastMessage(getTranslatedText('errorAddingAccount'), 'error'); // Reusing translation key
                            } finally {
                                showLoadingIndicator(false);
                            }
                        }
                    });
                    actionCell.appendChild(deleteBtn);
                });
            }
        } catch (error) {
            console.error("Error loading accounts:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        }
    };

    addAccountBtn.addEventListener('click', async () => {
        const name = newAccountNameInput.value.trim();
        if (!name) {
            alert(getTranslatedText('enterAccountName'));
            return;
        }
        showLoadingIndicator(true);
        try {
            const accountsCollectionRef = collection(db, 'accounts'); // Use direct import collection
            const existingAccountQueryRef = query(accountsCollectionRef, where('name', '==', name), limit(1)); // Use direct imports query, where, limit
            const existingAccountSnapshot = await getDocs(existingAccountQueryRef); // Use direct import getDocs
            if (!existingAccountSnapshot.empty) {
                alert(getTranslatedText('accountExists'));
                showLoadingIndicator(false);
                return;
            }

            await addDoc(accountsCollectionRef, { name: name }); // Use direct import addDoc
            showToastMessage(getTranslatedText('accountAddedSuccess'), 'success');
            newAccountNameInput.value = '';
            await fetchAllStaticData(); // Re-fetch all static data after adding
            await loadAndDisplayAccounts();
        } catch (error) {
            console.error("Error adding account:", error);
            showToastMessage(getTranslatedText('errorAddingAccount'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    });

    // Admin: Manage Task Definitions
    const loadAndDisplayTaskDefinitions = async () => {
        tasksDefinitionTableBody.innerHTML = '';
        try {
            // Use cached allTaskDefinitions data
            console.log("Task Definitions fetched for admin panel (from cache):", allTaskDefinitions.length); // Debug log
            if (allTaskDefinitions.length === 0) {
                const row = tasksDefinitionTableBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 3;
                cell.textContent = getTranslatedText('noDataToShow');
                cell.style.textAlign = 'center';
            } else {
                allTaskDefinitions.forEach(task => { // Iterate over cached tasks
                    console.log("Processing task definition for admin panel:", task.name); // Debug log
                    const row = tasksDefinitionTableBody.insertRow();
                    row.insertCell().textContent = task.name;
                    row.insertCell().textContent = task.timings ? task.timings.map(formatMinutesToMMSS).join(', ') : 'N/A'; // Format timings
                    const actionCell = row.insertCell();
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = getTranslatedText('deleteBtn');
                    deleteBtn.classList.add('admin-action-btn', 'delete');
                    deleteBtn.addEventListener('click', async () => {
                        if (confirm(getTranslatedText('confirmDeleteTask', { name: task.name }))) {
                            showLoadingIndicator(true);
                            try {
                                await deleteDoc(doc(db, 'tasks', task.id)); // Use direct imports deleteDoc, doc
                                showToastMessage(getTranslatedText('taskDeletedSuccess'), 'success');
                                await fetchAllStaticData(); // Re-fetch all static data after deletion
                                await loadAndDisplayTaskDefinitions(); // Reload after delete
                            } catch (err) {
                                console.error("Error deleting task definition:", err);
                                showToastMessage(getTranslatedText('errorAddingTask'), 'error'); // Reusing translation key
                            } finally {
                                showLoadingIndicator(false);
                            }
                        }
                    });
                    actionCell.appendChild(deleteBtn);
                });
            }
        } catch (error) {
            console.error("Error loading task definitions:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        }
    };

    addTimingFieldBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.1';
        input.classList.add('new-task-timing');
        input.placeholder = getTranslatedText('timingPlaceholder');
        newTimingsContainer.appendChild(input);
    });

    addTaskDefinitionBtn.addEventListener('click', async () => {
        const name = newTaskNameInput.value.trim();
        const timingInputs = newTimingsContainer.querySelectorAll('.new-task-timing');
        const timings = Array.from(timingInputs).map(input => parseFloat(input.value.trim())).filter(val => !isNaN(val) && val > 0);

        if (!name || timings.length === 0) {
            alert(getTranslatedText('enterTaskNameTiming'));
            return;
        }
        showLoadingIndicator(true);
        try {
            const tasksCollectionRef = collection(db, 'tasks'); // Use direct import collection
            const existingTaskQueryRef = query(tasksCollectionRef, where('name', '==', name), limit(1)); // Use direct imports query, where, limit
            const existingTaskSnapshot = await getDocs(existingTaskQueryRef); // Use direct import getDocs
            if (!existingTaskSnapshot.empty) {
                alert(getTranslatedText('taskExists'));
                showLoadingIndicator(false);
                return;
            }

            await addDoc(tasksCollectionRef, { name: name, timings: timings }); // Use direct import addDoc
            showToastMessage(getTranslatedText('taskAddedSuccess'), 'success');
            newTaskNameInput.value = '';
            newTimingsContainer.innerHTML = `<input type="number" step="0.1" class="new-task-timing" placeholder="${getTranslatedText('timingPlaceholder')}">`;
            await fetchAllStaticData(); // Re-fetch all static data after adding
            await loadAndDisplayTaskDefinitions();
        } catch (error) {
            console.error("Error adding task definition:", error);
            showToastMessage(getTranslatedText('errorAddingTask'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    });

    // Admin: Manage Work Records
    const populateUserFilter = async () => {
        recordFilterUser.innerHTML = `<option value="">${getTranslatedText('allUsers')}</option>`;
        try {
            // Use cached allUsers data
            allUsers.forEach(user => { // Iterate over cached users
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                recordFilterUser.appendChild(option);
            });
        } catch (error) {
            console.error("Error populating user filter (from cache):", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        }
    };

    const loadAndDisplayWorkRecords = async (userId = null, date = null) => {
        workRecordsTableBody.innerHTML = '';
        try {
            const workRecordsCollectionRef = collection(db, 'workRecords'); // Use direct import collection
            let recordsQuery = query(workRecordsCollectionRef, orderBy('timestamp', 'desc')); // Use direct imports query, orderBy

            if (userId) {
                recordsQuery = query(recordsQuery, where('userId', '==', userId)); // Use direct import where
            }

            if (date) {
                const startOfDay = new Date(date);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(date);
                endOfDay.setHours(23, 59, 59, 999);

                recordsQuery = query(recordsQuery,
                    where('timestamp', '>=', Timestamp.fromDate(startOfDay)), // Use direct import Timestamp, where
                    where('timestamp', '<=', Timestamp.fromDate(endOfDay)) // Use direct import Timestamp, where
                );
            }

            const recordsSnapshot = await getDocs(recordsQuery); // Use direct import getDocs
            console.log("Work Records fetched for admin panel:", recordsSnapshot.docs.length); // Debug log
            if (recordsSnapshot.empty) {
                const row = workRecordsTableBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 7;
                cell.textContent = getTranslatedText('noMatchingRecords');
                cell.style.textAlign = 'center';
            } else {
                recordsSnapshot.forEach(documentSnapshot => { // Changed param name to documentSnapshot for clarity
                    const record = getDocData(documentSnapshot);
                    console.log("Processing work record for admin panel:", record.id); // Debug log
                    const row = workRecordsTableBody.insertRow();
                    row.insertCell().textContent = record.userName;
                    row.insertCell().textContent = record.accountName;
                    row.insertCell().textContent = record.taskDefinitionName;
                    row.insertCell().textContent = record.totalTasksCount;
                    row.insertCell().textContent = formatMinutesToMMSS(record.totalTime); // Format total time
                    row.insertCell().textContent = record.timestamp ? new Date(record.timestamp.toDate()).toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US') : 'N/A'; // Format date

                    const actionCell = row.insertCell();
                    const editBtn = document.createElement('button');
                    editBtn.textContent = getTranslatedText('editRecord');
                    editBtn.classList.add('admin-action-btn');
                    editBtn.addEventListener('click', () => openEditRecordModal(record));
                    actionCell.appendChild(editBtn);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = getTranslatedText('deleteBtn');
                    deleteBtn.classList.add('admin-action-btn', 'delete');
                    deleteBtn.addEventListener('click', async () => {
                        if (confirm(getTranslatedText('confirmDeleteRecord', { name: record.userName }))) {
                            showLoadingIndicator(true);
                            try {
                                await deleteDoc(doc(db, 'workRecords', record.id)); // Use direct imports deleteDoc, doc
                                showToastMessage(getTranslatedText('recordDeletedSuccess'), 'success');
                                await loadAndDisplayWorkRecords(recordFilterUser.value, recordFilterDate.value); // Reload with current filters
                            } catch (err) {
                                console.error("Error deleting record:", err);
                                showToastMessage(getTranslatedText('errorDeletingRecord'), 'error');
                            } finally {
                                showLoadingIndicator(false);
                            }
                        }
                    });
                    actionCell.appendChild(deleteBtn);
                });
            }
        } catch (error) {
            console.error("Error loading work records:", error);
            showToastMessage(getTranslatedText('errorLoadingRecords'), 'error');
        }
    };

    filterRecordsBtn.addEventListener('click', async () => {
        const selectedUserId = recordFilterUser.value === "" ? null : recordFilterUser.value;
        const selectedDate = recordFilterDate.value === "" ? null : recordFilterDate.value;
        showLoadingIndicator(true); // Show loading for filter action
        try {
            await loadAndDisplayWorkRecords(selectedUserId, selectedDate);
        } finally {
            showLoadingIndicator(false); // Hide loading after filter
        }
    });

    // Edit Record Modal Logic
    const openEditRecordModal = (record) => {
        currentEditingRecordId = record.id;

        // Populate accounts select from cached data
        editAccountSelect.innerHTML = '';
        allAccounts.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = acc.name;
            editAccountSelect.appendChild(option);
        });
        editAccountSelect.value = record.accountId;

        // Populate tasks select from cached data
        editTaskTypeSelect.innerHTML = '';
        allTaskDefinitions.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.name;
            editTaskTypeSelect.appendChild(option);
        });
        editTaskTypeSelect.value = record.taskDefinitionId;

        editTotalTasksCount.value = record.totalTasksCount;
        editTotalTime.value = record.totalTime.toFixed(2); // Keep as decimal for input

        // Populate date and time inputs
        if (record.timestamp) {
            const recordDate = new Date(record.timestamp.toDate());
            editRecordDate.value = recordDate.toISOString().split('T')[0]; // ISO 8601 (YYYY-MM-DD)
            editRecordTime.value = recordDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        } else {
            editRecordDate.value = '';
            editRecordTime.value = '';
        }

        editRecordModal.style.display = 'flex'; // Use flex to center
    };

    closeEditRecordModalBtn.addEventListener('click', () => {
        editRecordModal.style.display = 'none';
        currentEditingRecordId = null;
    });

    window.addEventListener('click', (event) => {
        if (event.target === editRecordModal) {
            editRecordModal.style.display = 'none';
            currentEditingRecordId = null;
        }
    });

    saveEditedRecordBtn.addEventListener('click', async () => {
        if (!currentEditingRecordId) return;

        const newAccountId = editAccountSelect.value;
        const newTaskDefinitionId = editTaskTypeSelect.value;
        const newTotalTasksCount = parseInt(editTotalTasksCount.value);
        const newTotalTime = parseFloat(editTotalTime.value);
        const newDate = editRecordDate.value;
        const newTime = editRecordTime.value;

        if (!newAccountId || !newTaskDefinitionId || isNaN(newTotalTasksCount) || newTotalTasksCount < 0 || isNaN(newTotalTime) || newTotalTime < 0 || !newDate || !newTime) {
            alert(getTranslatedText('invalidEditData'));
            return;
        }

        const newAccountName = allAccounts.find(acc => acc.id === newAccountId)?.name || 'غير معروف';
        const newTaskDefinitionName = allTaskDefinitions.find(task => task.id === newTaskDefinitionId)?.name || 'غير معروف';

        // Combine date and time into a new Date object for timestamp
        const newTimestampDate = new Date(`${newDate}T${newTime}:00`); // Assuming time is HH:MM
        const newTimestamp = Timestamp.fromDate(newTimestampDate); // Use direct import Timestamp

        showLoadingIndicator(true);
        try {
            const recordDocRef = doc(db, 'workRecords', currentEditingRecordId); // Use direct import doc
            await updateDoc(recordDocRef, { // Use direct import updateDoc
                accountId: newAccountId,
                accountName: newAccountName,
                taskDefinitionId: newTaskDefinitionId,
                taskDefinitionName: newTaskDefinitionName,
                totalTasksCount: newTotalTasksCount,
                totalTime: newTotalTime,
                timestamp: newTimestamp, // Update the main timestamp of the record
                lastModified: serverTimestamp() // Use direct import serverTimestamp
            });
            showToastMessage(getTranslatedText('recordUpdatedSuccess'), 'success');
            editRecordModal.style.display = 'none';
            currentEditingRecordId = null;
            await loadAndDisplayWorkRecords(recordFilterUser.value, recordFilterDate.value); // Reload records
        } catch (error) {
            console.error("Error updating record:", error);
            showToastMessage(getTranslatedText('errorUpdatingRecord'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    });

    // 10. Initial setup when DOM is loaded
    checkConnectionStatus(); // Check connection status on load
    loadDarkModePreference(); // Load dark mode preference

    // Set initial language and apply translations
    setLanguage(currentLanguage);
    
    // Attempt to load session on initial page load
    // loadSession will call showPage() if a session is resumed,
    // which will hide loginPage.
    await loadSession(); // This will now call fetchAllStaticData if session is resumed

    // Event listeners for language buttons
    if (langArBtn) {
        langArBtn.addEventListener('click', () => {
            setLanguage('ar');
            langArBtn.classList.add('active');
            langEnBtn.classList.remove('active');
        });
    }
    if (langEnBtn) {
        langEnBtn.addEventListener('click', () => {
            setLanguage('en');
            langEnBtn.classList.add('active');
            langArBtn.classList.remove('active');
        });
    }

    // Event listener for dark mode toggle button
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }

    // Event listeners for connection status changes
    window.addEventListener('online', () => {
        showToastMessage(getTranslatedText('internetRestored'), 'success');
    });
    window.addEventListener('offline', () => {
        showToastMessage(getTranslatedText('internetLost'), 'error');
    });
});
