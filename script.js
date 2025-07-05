import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc, getDoc, runTransaction, arrayUnion, arrayRemove, Timestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase configuration (replace with your actual config)
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

// Global state
let loggedInUser = null;
let currentActiveTaskButton = null;
let currentAccountId = null; // Store selected account ID
let currentTaskTypeId = null; // Store selected task type ID
let currentTaskDefinitions = {}; // Store definitions for selected task type
let currentWorkEntry = {
    accountName: '',
    taskName: '',
    completedTasks: 0,
    totalTime: 0, // In minutes
    details: [], // Array of { timestamp, timeSpent, tasksCount }
    firebaseDocId: null // To store the ID if saving an existing record
};

// DOM Elements
const loginPage = document.getElementById('loginPage');
const mainDashboard = document.getElementById('mainDashboard');
const startWorkPage = document.getElementById('startWorkPage');
const trackWorkPage = document.getElementById('trackWorkPage');
const adminPanelPage = document.getElementById('adminPanelPage');

// Login Page Elements
const pinInputs = [];
for (let i = 1; i <= 8; i++) {
    pinInputs.push(document.getElementById(`pinInput${i}`));
}
const loginError = document.getElementById('loginError');

// Main Dashboard Elements
const userNameDisplay = document.getElementById('userNameDisplay');
const totalHoursDisplay = document.getElementById('totalHoursDisplay');
const totalBalanceDisplay = document.getElementById('totalBalanceDisplay');
const logoutDashboardBtn = document.getElementById('logoutDashboardBtn');
const startWorkOption = document.getElementById('startWorkOption');
const trackWorkOption = document.getElementById('trackWorkOption');
const adminPanelOption = document.getElementById('adminPanelOption'); // Assuming an admin option exists

// Start Work Page Elements
const taskSelectionPopup = document.getElementById('taskSelectionPopup');
const accountSelect = document.getElementById('accountSelect');
const taskTypeSelect = document.getElementById('taskTypeSelect');
const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');
const backToDashboardFromPopup = document.getElementById('backToDashboardFromPopup');
const taskDetailsContainer = document.getElementById('taskDetailsContainer');
const completedTasksCount = document.getElementById('completedTasksCount');
const recordedTotalTime = document.getElementById('recordedTotalTime');
const detailedSummaryContainer = document.getElementById('detailedSummaryContainer');
const taskTimingButtonsContainer = document.getElementById('taskTimingButtonsContainer');
const saveWorkBtn = document.getElementById('saveWorkBtn');
const backToDashboardFromStartWork = document.getElementById('backToDashboardFromStartWork');

// Track Work Page Elements
const taskChartCanvas = document.getElementById('taskChart');
const trackTasksTableBody = document.getElementById('trackTasksTableBody');
const trackTasksTableFoot = document.getElementById('trackTasksTableFoot');
const backToDashboardFromTrack = document.getElementById('backToDashboardFromTrack');
let taskChart = null; // Chart.js instance

// Admin Panel Elements
const newUserNameInput = document.getElementById('newUserNameInput');
const newUserPINInput = document.getElementById('newUserPINInput');
const addUserBtn = document.getElementById('addUserBtn');
const usersTableBody = document.getElementById('usersTableBody');
const newAccountNameInput = document.getElementById('newAccountNameInput');
const newAccountPriceInput = document.getElementById('newAccountPriceInput'); // New
const addAccountBtn = document.getElementById('addAccountBtn');
const accountsTableBody = document.getElementById('accountsTableBody');
const newTaskNameInput = document.getElementById('newTaskNameInput');
const newTimingsContainer = document.getElementById('newTimingsContainer');
const addTimingFieldBtn = document.getElementById('addTimingFieldBtn');
const addTaskDefinitionBtn = document.getElementById('addTaskDefinitionBtn');
const tasksDefinitionTableBody = document.getElementById('tasksDefinitionTableBody');
const recordFilterDate = document.getElementById('recordFilterDate');
const recordFilterUser = document.getElementById('recordFilterUser');
const filterRecordsBtn = document.getElementById('filterRecordsBtn');
const workRecordsTableBody = document.getElementById('workRecordsTableBody');
const logoutAdminBtn = document.getElementById('logoutAdminBtn');

// New Admin Panel Elements for Employee Rates
const employeeRatesTableBody = document.getElementById('employeeRatesTableBody');
const editEmployeeRateModal = document.getElementById('editEmployeeRateModal');
const modalEmployeeName = document.getElementById('modalEmployeeName');
const modalAccountName = document.getElementById('modalAccountName');
const modalDefaultPrice = document.getElementById('modalDefaultPrice');
const modalCustomPriceInput = document.getElementById('modalCustomPriceInput');
const saveCustomRateBtn = document.getElementById('saveCustomRateBtn');
let currentEditingRate = { userId: null, accountId: null, docId: null };

// Edit Record Modal Elements
const editRecordModal = document.getElementById('editRecordModal');
const editAccountSelect = document.getElementById('editAccountSelect');
const editTaskTypeSelect = document.getElementById('editTaskTypeSelect');
const editTotalTasksCount = document.getElementById('editTotalTasksCount');
const editTotalTime = document.getElementById('editTotalTime');
const editRecordDate = document.getElementById('editRecordDate');
const editRecordTime = document.getElementById('editRecordTime');
const saveEditedRecordBtn = document.getElementById('saveEditedRecordBtn');
const closeEditModalBtn = editRecordModal.querySelector('.close-button');
let currentEditingRecordId = null;

// Loading and Toast Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const toastMessage = document.getElementById('toastMessage');
const langArBtn = document.getElementById('langArBtn');
const langEnBtn = document.getElementById('langEnBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = darkModeToggle ? darkModeToggle.querySelector('i') : null;


// --- Utility Functions ---

// Function to show/hide loading indicator
function showLoadingIndicator(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Function to show toast messages (notifications)
const showToastMessage = (message, type) => {
    toastMessage.textContent = message;
    toastMessage.className = `toast-message ${type}`; // Add type class (success/error)
    toastMessage.style.display = 'block';
    void toastMessage.offsetWidth; // Trigger reflow for animation
    toastMessage.classList.add('show');

    setTimeout(() => {
        toastMessage.classList.remove('show');
        toastMessage.addEventListener('transitionend', function handler() {
            toastMessage.style.display = 'none';
            toastMessage.removeEventListener('transitionend', handler);
        }, { once: true });
    }, 3000); // Hide after 3 seconds
};

// Get document data with ID
const getDocData = (documentSnapshot) => {
    if (documentSnapshot.exists()) {
        return { id: documentSnapshot.id, ...documentSnapshot.data() };
    }
    return null;
};

// Format minutes to HH:MM string
const formatMinutesToHHMM = (totalMinutes) => {
    if (isNaN(totalMinutes) || totalMinutes < 0) return "00:00";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60); // Round minutes for display
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Format minutes to HH:MM:SS (or just MM:SS if less than hour)
const formatSecondsToMMSS = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
        updateDarkModeIcon(false);
    }
};

const toggleDarkMode = () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    updateDarkModeIcon(isDarkMode);
    if (taskChart) {
        renderTaskChart(); // Re-render chart to apply new colors
    }
};

const updateDarkModeIcon = (isDarkMode) => {
    if (darkModeIcon) {
        if (isDarkMode) {
            darkModeIcon.classList.remove('fa-moon');
            darkModeIcon.classList.add('fa-sun');
        } else {
            darkModeIcon.classList.remove('fa-sun');
            darkModeIcon.classList.add('fa-moon');
        }
    }
};

// Language Support
const translations = {
    'ar': {
        'loginTitle': 'تسجيل الدخول',
        'pinPlaceholder': 'أدخل رمز PIN',
        'loginBtn': 'دخول',
        'hello': 'مرحباً،',
        'totalHoursTitle': 'إجمالي ساعات العمل:',
        'hoursUnit': 'ساعة',
        'totalBalanceTitle': 'إجمالي الرصيد:',
        'currencyUnit': 'جنيه',
        'startWorkOption': 'بدء العمل',
        'trackWorkOption': 'متابعة العمل',
        'chooseTask': 'اختر المهمة',
        'accountName': 'اسم الحساب:',
        'taskType': 'نوع المهمة:',
        'confirmBtn': 'تأكيد',
        'backToDashboard': 'رجوع للرئيسية',
        'taskCount': 'عدد المهام المنجزة:',
        'totalTimeRecorded': 'إجمالي الوقت المسجل:',
        'saveWorkBtn': 'حفظ العمل',
        'trackWorkTitle': 'متابعة العمل',
        'serialColumn': 'المسلسل',
        'dateColumn': 'التاريخ',
        'accountNameColumn': 'اسم الحساب',
        'taskColumn': 'المهمة',
        'timingValueColumn': 'التوقيت (دقيقة)',
        'completedTasksColumn': 'عدد المهام المنجزة',
        'totalTimeMinutesColumn': 'إجمالي الوقت (دقيقة)',
        'totalForTaskColumn': 'إجمالي المهمة',
        'totalForAccountColumn': 'إجمالي الحساب',
        'dailyTotalTimeColumn': 'إجمالي اليوم',
        'adminPanelTitle': 'لوحة تحكم المدير',
        'manageUsers': 'إدارة المستخدمين',
        'newUserName': 'اسم المستخدم الجديد',
        'newUserPIN': 'رمز PIN للمستخدم (8 أرقام)',
        'addUserBtn': 'إضافة مستخدم',
        'currentUsers': 'المستخدمون الحاليون:',
        'nameColumn': 'الاسم',
        'pinColumn': 'PIN',
        'actionsColumn': 'إجراءات',
        'manageAccounts': 'إدارة الحسابات',
        'newAccountName': 'اسم الحساب الجديد',
        'addAccountBtn': 'إضافة حساب',
        'currentAccounts': 'الحسابات الحالية:',
        'manageTasks': 'إدارة المهام والتوقيتات',
        'newTaskName': 'اسم المهمة الجديدة',
        'timingPlaceholder': 'التوقيت (بالدقائق)',
        'minutesPlaceholder': 'دقائق', // New
        'secondsPlaceholder': 'ثواني', // New
        'addTimingField': 'إضافة حقل توقيت',
        'addTaskBtn': 'إضافة مهمة جديدة',
        'currentTasks': 'المهام الحالية:',
        'taskNameColumn': 'المهمة',
        'timingsColumn': 'التوقيتات (دقائق)', // Will update display in JS
        'manageWorkRecords': 'إدارة سجلات العمل',
        'filterBtn': 'تصفية',
        'userColumn': 'المستخدم',
        'logoutAdmin': 'تسجيل الخروج',
        'editRecord': 'تعديل سجل العمل',
        'taskCountEdit': 'عدد المهام:',
        'totalTimeEdit': 'إجمالي الوقت (دقيقة):',
        'timeColumn': 'الوقت:',
        'saveChangesBtn': 'حفظ التعديلات',
        'loginFailed': 'رمز PIN غير صحيح.',
        'userAdded': 'تمت إضافة المستخدم بنجاح.',
        'accountAdded': 'تمت إضافة الحساب بنجاح.',
        'taskAdded': 'تمت إضافة المهمة بنجاح.',
        'dataSaved': 'تم حفظ العمل بنجاح!',
        'recordUpdated': 'تم تحديث السجل بنجاح.',
        'recordDeleted': 'تم حذف السجل بنجاح.',
        'userDeleted': 'تم حذف المستخدم بنجاح.',
        'accountDeleted': 'تم حذف الحساب بنجاح.',
        'taskDeleted': 'تم حذف المهمة بنجاح.',
        'fillAllFields': 'يرجى ملء جميع الحقول المطلوبة.',
        'pinLengthError': 'يجب أن يكون رمز PIN من 8 أرقام.',
        'pinDigitsOnly': 'يجب أن يحتوي رمز PIN على أرقام فقط.',
        'confirmDelete': 'هل أنت متأكد أنك تريد حذف هذا؟',
        'noDataToShow': 'لا توجد بيانات لعرضها.',
        'noInternet': 'لا يوجد اتصال بالإنترنت. قد لا يتم تحميل البيانات.',
        'internetRestored': 'تم استعادة الاتصال بالإنترنت.',
        'internetLost': 'تم فقدان الاتصال بالإنترنت. يرجى التحقق من اتصالك.',
        'today': 'اليوم',
        'thisWeek': 'هذا الأسبوع',
        'thisMonth': 'هذا الشهر',
        'last7Days': 'آخر 7 أيام',
        'last30Days': 'آخر 30 يومًا',
        'dailyWorkHours': 'ساعات العمل اليومية',
        'noTasksStarted': 'لم تبدأ أي مهام بعد.',
        'selectAccountAndTask': 'يرجى اختيار الحساب ونوع المهمة.',
        'defaultPricePlaceholder': 'السعر الافتراضي للساعة (جنيه)', // New
        'defaultPriceColumn': 'السعر الافتراضي/ساعة', // New
        'manageEmployeeRates': 'إدارة أسعار الموظفين والإجماليات', // New
        'employeeNameColumn': 'الموظف', // New
        'customPriceColumn': 'السعر المخصص/ساعة', // New
        'employeeTotalHoursColumn': 'إجمالي الساعات', // New
        'employeeTotalBalanceColumn': 'إجمالي الرصيد المستحق', // New
        'editCustomRateTitle': 'تعديل السعر المخصص', // New
        'employeeNameLabel': 'الموظف:', // New
        'accountNameLabel': 'الحساب:', // New
        'defaultPriceLabel': 'السعر الافتراضي:', // New
        'customPriceInputLabel': 'السعر المخصص (جنيه):', // New
        'rateUpdated': 'تم تحديث السعر المخصص بنجاح.', // New
        'invalidTime': 'يرجى إدخال قيم صالحة للدقائق والثواني.', // New
        'timingFormat': 'دقائق:ثواني', // New for task definitions table
    },
    'en': {
        'loginTitle': 'Login',
        'pinPlaceholder': 'Enter PIN',
        'loginBtn': 'Login',
        'hello': 'Hello,',
        'totalHoursTitle': 'Total Work Hours:',
        'hoursUnit': 'hours',
        'totalBalanceTitle': 'Total Balance:',
        'currencyUnit': 'EGP',
        'startWorkOption': 'Start Work',
        'trackWorkOption': 'Track Work',
        'chooseTask': 'Choose Task',
        'accountName': 'Account Name:',
        'taskType': 'Task Type:',
        'confirmBtn': 'Confirm',
        'backToDashboard': 'Back to Dashboard',
        'taskCount': 'Completed Tasks Count:',
        'totalTimeRecorded': 'Total Time Recorded:',
        'saveWorkBtn': 'Save Work',
        'trackWorkTitle': 'Track Work',
        'serialColumn': 'Serial',
        'dateColumn': 'Date',
        'accountNameColumn': 'Account Name',
        'taskColumn': 'Task',
        'timingValueColumn': 'Timing (minutes)',
        'completedTasksColumn': 'Completed Tasks',
        'totalTimeMinutesColumn': 'Total Time (minutes)',
        'totalForTaskColumn': 'Total for Task',
        'totalForAccountColumn': 'Total for Account',
        'dailyTotalTimeColumn': 'Daily Total Time',
        'adminPanelTitle': 'Admin Panel',
        'manageUsers': 'Manage Users',
        'newUserName': 'New User Name',
        'newUserPIN': 'User PIN (8 digits)',
        'addUserBtn': 'Add User',
        'currentUsers': 'Current Users:',
        'nameColumn': 'Name',
        'pinColumn': 'PIN',
        'actionsColumn': 'Actions',
        'manageAccounts': 'Manage Accounts',
        'newAccountName': 'New Account Name',
        'addAccountBtn': 'Add Account',
        'currentAccounts': 'Current Accounts:',
        'manageTasks': 'Manage Tasks and Timings',
        'newTaskName': 'New Task Name',
        'timingPlaceholder': 'Timing (in minutes)',
        'minutesPlaceholder': 'Minutes', // New
        'secondsPlaceholder': 'Seconds', // New
        'addTimingField': 'Add Timing Field',
        'addTaskBtn': 'Add New Task',
        'currentTasks': 'Current Tasks:',
        'taskNameColumn': 'Task',
        'timingsColumn': 'Timings (minutes)', // Will update display in JS
        'manageWorkRecords': 'Manage Work Records',
        'filterBtn': 'Filter',
        'userColumn': 'User',
        'logoutAdmin': 'Logout',
        'editRecord': 'Edit Work Record',
        'taskCountEdit': 'Number of Tasks:',
        'totalTimeEdit': 'Total Time (minutes):',
        'timeColumn': 'Time:',
        'saveChangesBtn': 'Save Changes',
        'loginFailed': 'Incorrect PIN.',
        'userAdded': 'User added successfully.',
        'accountAdded': 'Account added successfully.',
        'taskAdded': 'Task added successfully.',
        'dataSaved': 'Work saved successfully!',
        'recordUpdated': 'Record updated successfully.',
        'recordDeleted': 'Record deleted successfully.',
        'userDeleted': 'User deleted successfully.',
        'accountDeleted': 'Account deleted successfully.',
        'taskDeleted': 'Task deleted successfully.',
        'fillAllFields': 'Please fill in all required fields.',
        'pinLengthError': 'PIN must be 8 digits long.',
        'pinDigitsOnly': 'PIN must contain digits only.',
        'confirmDelete': 'Are you sure you want to delete this?',
        'noDataToShow': 'No data to display.',
        'noInternet': 'No internet connection. Data may not be loaded.',
        'internetRestored': 'Internet connection restored.',
        'internetLost': 'Internet connection lost. Please check your connection.',
        'today': 'Today',
        'thisWeek': 'This Week',
        'thisMonth': 'This Month',
        'last7Days': 'Last 7 Days',
        'last30Days': 'Last 30 Days',
        'dailyWorkHours': 'Daily Work Hours',
        'noTasksStarted': 'No tasks started yet.',
        'selectAccountAndTask': 'Please select an account and task type.',
        'defaultPricePlaceholder': 'Default Price per Hour (EGP)', // New
        'defaultPriceColumn': 'Default Price/Hour', // New
        'manageEmployeeRates': 'Manage Employee Rates & Totals', // New
        'employeeNameColumn': 'Employee', // New
        'customPriceColumn': 'Custom Price/Hour', // New
        'employeeTotalHoursColumn': 'Total Hours', // New
        'employeeTotalBalanceColumn': 'Total Balance Due', // New
        'editCustomRateTitle': 'Edit Custom Rate', // New
        'employeeNameLabel': 'Employee:', // New
        'accountNameLabel': 'Account:', // New
        'defaultPriceLabel': 'Default Price:', // New
        'customPriceInputLabel': 'Custom Price (EGP):', // New
        'rateUpdated': 'Custom rate updated successfully.', // New
        'invalidTime': 'Please enter valid values for minutes and seconds.', // New
        'timingFormat': 'MM:SS', // New for task definitions table
    }
};

let currentLanguage = localStorage.getItem('appLanguage') || 'ar';

const setLanguage = (lang) => {
    currentLanguage = lang;
    localStorage.setItem('appLanguage', lang);
    applyTranslations();
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    if (taskChart) {
        renderTaskChart(); // Re-render chart to update labels direction
    }
    // Update PIN input direction if needed (usually handled by dir=rtl/ltr on html)
    pinInputs.forEach(input => {
        if (lang === 'ar') {
            input.style.direction = 'ltr'; // PIN numbers are usually LTR even in RTL context
        } else {
            input.style.direction = 'ltr';
        }
    });
};

const getTranslatedText = (key, params = {}) => {
    let text = translations[currentLanguage][key];
    if (text) {
        for (const param in params) {
            text = text.replace(`{${param}}`, params[param]);
        }
        return text;
    }
    return `[${key}]`;
};

const applyTranslations = () => {
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.getAttribute('data-key');
        if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
            element.placeholder = getTranslatedText(key);
        } else {
            element.textContent = getTranslatedText(key);
        }
    });
};

// --- Page Navigation ---

const showPage = (pageToShow) => {
    const pages = [loginPage, mainDashboard, startWorkPage, trackWorkPage, adminPanelPage];
    pages.forEach(page => {
        if (page) { // Check if the page element exists
            page.style.display = 'none';
        }
    });
    if (pageToShow) { // Check if the target page element exists
        pageToShow.style.display = 'flex'; // Use flex for centering
    }
};

const goToDashboard = async () => {
    if (loggedInUser) {
        showPage(mainDashboard);
        await updateDashboardDisplay();
    } else {
        showPage(loginPage);
    }
};

const goToStartWork = async () => {
    if (!loggedInUser) {
        showPage(loginPage);
        return;
    }
    showPage(startWorkPage);
    taskDetailsContainer.style.display = 'none'; // Hide details until task selected
    taskSelectionPopup.style.display = 'block'; // Show task selection popup
    await populateAccountAndTaskSelects();
};

const goToTrackWork = async () => {
    if (!loggedInUser) {
        showPage(loginPage);
        return;
    }
    showPage(trackWorkPage);
    await renderTrackWorkPage();
};

const goToAdminPanel = async () => {
    // Only admin can access this
    if (loggedInUser && loggedInUser.isAdmin) {
        showPage(adminPanelPage);
        await renderAdminPanel();
    } else {
        showPage(mainDashboard); // Redirect to dashboard if not admin
        showToastMessage(getTranslatedText('unauthorizedAccess'), 'error'); // Optional: show message
    }
};

// --- Authentication ---

const login = async (pin) => {
    showLoadingIndicator(true);
    loginError.style.display = 'none';
    try {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('pin', '==', pin));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            loggedInUser = getDocData(querySnapshot.docs[0]);
            localStorage.setItem('loggedInUserId', loggedInUser.id);
            localStorage.setItem('loggedInUserIsAdmin', loggedInUser.isAdmin ? 'true' : 'false');
            await goToDashboard();
        } else {
            loginError.textContent = getTranslatedText('loginFailed');
            loginError.style.display = 'block';
            loggedInUser = null;
            localStorage.removeItem('loggedInUserId');
            localStorage.removeItem('loggedInUserIsAdmin');
        }
    } catch (error) {
        console.error("Error logging in:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        loginError.textContent = getTranslatedText('errorLoadingData');
        loginError.style.display = 'block';
    } finally {
        showLoadingIndicator(false);
    }
};

const logout = () => {
    loggedInUser = null;
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('loggedInUserIsAdmin');
    showPage(loginPage);
    currentWorkEntry = { accountName: '', taskName: '', completedTasks: 0, totalTime: 0, details: [], firebaseDocId: null };
    currentActiveTaskButton = null;
    currentAccountId = null;
    currentTaskTypeId = null;
    currentTaskDefinitions = {};
    if (taskChart) {
        taskChart.destroy();
        taskChart = null;
    }
    // Clear PIN inputs on logout
    pinInputs.forEach(input => input.value = '');
    pinInputs[0].focus();
};

// --- Dashboard Functions ---

const updateDashboardDisplay = async () => {
    if (!loggedInUser) return;

    userNameDisplay.textContent = loggedInUser.name;

    showLoadingIndicator(true);
    try {
        const workRecordsCol = collection(db, 'workRecords');
        const q = query(workRecordsCol, where('userId', '==', loggedInUser.id));
        const querySnapshot = await getDocs(q);

        let totalMinutes = 0;
        let totalBalance = 0;

        const accountsMap = new Map();
        const accountsSnapshot = await getDocs(collection(db, 'accounts'));
        accountsSnapshot.forEach(doc => accountsMap.set(doc.id, doc.data()));

        const userAccountRatesMap = new Map();
        const userAccountRatesSnapshot = await getDocs(query(collection(db, 'userAccountRates'), where('userId', '==', loggedInUser.id)));
        userAccountRatesSnapshot.forEach(doc => userAccountRatesMap.set(doc.data().accountId, doc.data().customPricePerHour));

        querySnapshot.docs.forEach(doc => {
            const record = doc.data();
            totalMinutes += record.totalTime; // totalTime is already in minutes

            const accountId = record.accountId;
            const account = accountsMap.get(accountId);

            if (account) {
                let pricePerHour = account.defaultPricePerHour || 0; // Default price from account
                // Check for custom rate for this user and account
                if (userAccountRatesMap.has(accountId)) {
                    pricePerHour = userAccountRatesMap.get(accountId);
                }
                totalBalance += (record.totalTime / 60) * pricePerHour;
            }
        });

        totalHoursDisplay.textContent = formatMinutesToHHMM(totalMinutes);
        totalBalanceDisplay.textContent = totalBalance.toFixed(2); // Display balance with 2 decimal places

    } catch (error) {
        console.error("Error updating dashboard display:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// --- Start Work Page Functions ---

const populateAccountAndTaskSelects = async () => {
    showLoadingIndicator(true);
    try {
        // Populate Account Select
        accountSelect.innerHTML = '<option value="">' + getTranslatedText('selectAccount') + '</option>';
        const accountsCol = collection(db, 'accounts');
        const accountsSnapshot = await getDocs(orderBy(accountsCol, 'name'));
        accountsSnapshot.docs.forEach(doc => {
            const account = getDocData(doc);
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.name;
            accountSelect.appendChild(option);
        });

        // Populate Task Type Select
        taskTypeSelect.innerHTML = '<option value="">' + getTranslatedText('selectTaskType') + '</option>';
        const tasksCol = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(orderBy(tasksCol, 'name'));
        tasksSnapshot.docs.forEach(doc => {
            const task = getDocData(doc);
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.name;
            taskTypeSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating selects:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const handleConfirmSelection = async () => {
    currentAccountId = accountSelect.value;
    currentTaskTypeId = taskTypeSelect.value;

    if (!currentAccountId || !currentTaskTypeId) {
        showToastMessage(getTranslatedText('selectAccountAndTask'), 'error');
        return;
    }

    showLoadingIndicator(true);
    try {
        // Fetch task definitions for the selected task type
        const taskDocRef = doc(db, 'tasks', currentTaskTypeId);
        const taskDocSnap = await getDoc(taskDocRef);

        if (taskDocSnap.exists()) {
            currentTaskDefinitions = taskDocSnap.data().timings || {};
            currentWorkEntry.taskName = taskDocSnap.data().name; // Store task name

            // Fetch account name
            const accountDocRef = doc(db, 'accounts', currentAccountId);
            const accountDocSnap = await getDoc(accountDocRef);
            if (accountDocSnap.exists()) {
                currentWorkEntry.accountName = accountDocSnap.data().name;
            }

            // Check for an existing work record for today, for this user, account, and task type
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

            const workRecordsCol = collection(db, 'workRecords');
            const q = query(
                workRecordsCol,
                where('userId', '==', loggedInUser.id),
                where('accountId', '==', currentAccountId),
                where('taskTypeId', '==', currentTaskTypeId),
                where('timestamp', '>=', Timestamp.fromDate(today)),
                where('timestamp', '<', Timestamp.fromDate(tomorrow))
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Load existing record
                const existingRecord = getDocData(querySnapshot.docs[0]);
                currentWorkEntry.completedTasks = existingRecord.completedTasks;
                currentWorkEntry.totalTime = existingRecord.totalTime;
                currentWorkEntry.details = existingRecord.details || [];
                currentWorkEntry.firebaseDocId = existingRecord.id;
                console.log("Loaded existing record:", existingRecord);
            } else {
                // Start a new record
                currentWorkEntry.completedTasks = 0;
                currentWorkEntry.totalTime = 0;
                currentWorkEntry.details = [];
                currentWorkEntry.firebaseDocId = null;
                console.log("Starting new record.");
            }

            updateWorkEntryDisplay();
            renderTaskTimingButtons();
            taskSelectionPopup.style.display = 'none';
            taskDetailsContainer.style.display = 'block';

        } else {
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        }
    } catch (error) {
        console.error("Error confirming selection:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const updateWorkEntryDisplay = () => {
    completedTasksCount.textContent = currentWorkEntry.completedTasks;
    recordedTotalTime.textContent = formatMinutesToHHMM(currentWorkEntry.totalTime);

    detailedSummaryContainer.innerHTML = '';
    if (currentWorkEntry.details.length === 0) {
        detailedSummaryContainer.textContent = getTranslatedText('noTasksStarted');
        return;
    }

    currentWorkEntry.details.forEach((detail, index) => {
        const detailDiv = document.createElement('div');
        const recordTime = detail.timestamp.toDate();
        const formattedTime = recordTime.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        detailDiv.textContent = `${formattedTime}: ${detail.tasksCount} ${getTranslatedText('taskCount')} / ${formatMinutesToHHMM(detail.timeSpent)}`;
        detailedSummaryContainer.appendChild(detailDiv);
    });
    // Scroll to bottom
    detailedSummaryContainer.scrollTop = detailedSummaryContainer.scrollHeight;
};

const renderTaskTimingButtons = () => {
    taskTimingButtonsContainer.innerHTML = '';
    const timings = Object.values(currentTaskDefinitions); // Get all timing values

    timings.forEach(timing => {
        const button = document.createElement('button');
        button.classList.add('task-timing-button');
        
        // Convert timing from minutes (decimal) back to MM:SS for button text
        const totalSeconds = timing * 60;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.round(totalSeconds % 60); // Round seconds for display
        button.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        button.dataset.timing = timing; // Store timing in minutes (decimal)

        button.addEventListener('click', () => {
            if (currentActiveTaskButton) {
                currentActiveTaskButton.classList.remove('active-task');
            }
            button.classList.add('active-task');
            currentActiveTaskButton = button;
            addTaskEntry(parseFloat(timing)); // Use parsed timing
        });
        taskTimingButtonsContainer.appendChild(button);
    });
};

const addTaskEntry = (timingMinutes) => {
    currentWorkEntry.completedTasks += 1;
    currentWorkEntry.totalTime += timingMinutes;

    currentWorkEntry.details.push({
        timestamp: Timestamp.now(),
        timeSpent: timingMinutes,
        tasksCount: 1
    });

    updateWorkEntryDisplay();
};

const saveWorkRecord = async () => {
    if (!loggedInUser || !currentAccountId || !currentTaskTypeId) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        return;
    }

    showLoadingIndicator(true);
    try {
        const workRecordsCol = collection(db, 'workRecords');

        const recordData = {
            userId: loggedInUser.id,
            accountId: currentAccountId,
            taskTypeId: currentTaskTypeId,
            accountName: currentWorkEntry.accountName,
            taskName: currentWorkEntry.taskName,
            completedTasks: currentWorkEntry.completedTasks,
            totalTime: currentWorkEntry.totalTime,
            details: currentWorkEntry.details,
            timestamp: Timestamp.now()
        };

        if (currentWorkEntry.firebaseDocId) {
            // Update existing document
            const docRef = doc(db, 'workRecords', currentWorkEntry.firebaseDocId);
            await updateDoc(docRef, recordData);
            console.log("Work record updated:", recordData);
        } else {
            // Add new document
            const docRef = await addDoc(workRecordsCol, recordData);
            currentWorkEntry.firebaseDocId = docRef.id; // Store ID for future updates
            console.log("Work record added:", recordData);
        }
        showToastMessage(getTranslatedText('dataSaved'), 'success');

        // Reset for new work session
        currentWorkEntry = { accountName: '', taskName: '', completedTasks: 0, totalTime: 0, details: [], firebaseDocId: null };
        currentActiveTaskButton = null;
        currentAccountId = null;
        currentTaskTypeId = null;
        currentTaskDefinitions = {};
        goToDashboard(); // Go back to dashboard after saving

    } catch (error) {
        console.error("Error saving work record:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// --- Track Work Page Functions ---

const renderTrackWorkPage = async () => {
    if (!loggedInUser) return;

    showLoadingIndicator(true);
    try {
        const workRecordsCol = collection(db, 'workRecords');
        const q = query(workRecordsCol, where('userId', '==', loggedInUser.id), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        trackTasksTableBody.innerHTML = '';
        trackTasksTableFoot.innerHTML = '';

        if (querySnapshot.empty) {
            trackTasksTableBody.innerHTML = `<tr><td colspan="10">${getTranslatedText('noDataToShow')}</td></tr>`;
            if (taskChart) taskChart.destroy();
            return;
        }

        const dailyTotals = {}; // { 'YYYY-MM-DD': totalMinutes }
        const taskTotals = {}; // { 'taskId': totalMinutes }
        const accountTotals = {}; // { 'accountId': totalMinutes }

        const accountsMap = new Map();
        const accountsSnapshot = await getDocs(collection(db, 'accounts'));
        accountsSnapshot.forEach(doc => accountsMap.set(doc.id, doc.data()));

        const userAccountRatesMap = new Map();
        const userAccountRatesSnapshot = await getDocs(query(collection(db, 'userAccountRates'), where('userId', '==', loggedInUser.id)));
        userAccountRatesSnapshot.forEach(doc => userAccountRatesMap.set(doc.data().accountId, doc.data().customPricePerHour));

        let grandTotalMinutes = 0;

        querySnapshot.docs.forEach((docSnap, index) => {
            const record = getDocData(docSnap);
            const recordDate = record.timestamp.toDate();
            const formattedDate = recordDate.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US');

            // Daily totals
            const dateKey = recordDate.toISOString().split('T')[0];
            dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + record.totalTime;

            // Task totals
            taskTotals[record.taskName] = (taskTotals[record.taskName] || 0) + record.totalTime;

            // Account totals
            accountTotals[record.accountName] = (accountTotals[record.accountName] || 0) + record.totalTime;

            grandTotalMinutes += record.totalTime;

            const row = trackTasksTableBody.insertRow();
            row.insertCell().textContent = index + 1;
            row.insertCell().textContent = formattedDate;
            row.insertCell().textContent = record.accountName;
            row.insertCell().textContent = record.taskName;
            
            // Reconstruct individual timing values for display if needed from details, or just show average
            // For simplicity, we'll just show the total time for the record here, and completed tasks
            const individualTimingText = record.details && record.details.length > 0
                ? record.details.map(d => formatMinutesToHHMM(d.timeSpent)).join(', ')
                : formatMinutesToHHMM(record.totalTime / record.completedTasks); // Average timing

            row.insertCell().textContent = individualTimingText; // Display individual timings
            row.insertCell().textContent = record.completedTasks;
            row.insertCell().textContent = record.totalTime.toFixed(2); // Total time for this record in minutes

            // Calculate total for this specific task instance (record) in currency
            const accountId = record.accountId;
            const account = accountsMap.get(accountId);
            let pricePerHour = account ? (account.defaultPricePerHour || 0) : 0;
            if (userAccountRatesMap.has(accountId)) {
                pricePerHour = userAccountRatesMap.get(accountId);
            }
            const totalForRecord = (record.totalTime / 60) * pricePerHour;
            row.insertCell().textContent = `${totalForRecord.toFixed(2)} ${getTranslatedText('currencyUnit')}`;

            // Account and Daily totals will be in the footer
            row.insertCell().textContent = ''; // Placeholder for Total for Account
            row.insertCell().textContent = ''; // Placeholder for Daily Total Time
        });

        // Populate table footer with aggregated totals
        const footerRow1 = trackTasksTableFoot.insertRow();
        footerRow1.insertCell().colSpan = 6;
        footerRow1.insertCell().textContent = `${getTranslatedText('totalTimeMinutesColumn')}: ${grandTotalMinutes.toFixed(2)}`;
        footerRow1.insertCell().colSpan = 3;
        footerRow1.insertCell().textContent = ''; // Placeholder for grand total balance (will calculate later)

        // Add daily totals to footer as well, or as a separate section if needed
        for (const date in dailyTotals) {
            const row = trackTasksTableFoot.insertRow();
            row.insertCell().colSpan = 8;
            row.insertCell().textContent = `${getTranslatedText('dailyTotalTimeColumn')} (${date}): ${formatMinutesToHHMM(dailyTotals[date])}`;
            row.insertCell().colSpan = 2;
            row.insertCell().textContent = ''; // No balance here
        }


        // Render Chart
        renderTaskChart(dailyTotals);

    } catch (error) {
        console.error("Error rendering track work page:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const renderTaskChart = (dailyTotalsData) => {
    if (taskChart) {
        taskChart.destroy();
    }

    const labels = Object.keys(dailyTotalsData).sort(); // Dates
    const data = labels.map(date => (dailyTotalsData[date] / 60).toFixed(2)); // Convert minutes to hours

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#00e6e6' : '#2c3e50';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const borderColor = isDarkMode ? '#00e6e6' : '#007bff';

    taskChart = new Chart(taskChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: getTranslatedText('dailyWorkHours'),
                data: data,
                borderColor: borderColor,
                backgroundColor: isDarkMode ? 'rgba(0, 230, 230, 0.2)' : 'rgba(0, 123, 255, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointHoverRadius: 6,
                pointHoverBorderColor: '#fff',
                pointHoverBackgroundColor: borderColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                },
                tooltip: {
                    rtl: (currentLanguage === 'ar'),
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw} ${getTranslatedText('hoursUnit')}`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: getTranslatedText('dailyWorkHours'),
                    color: textColor,
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: getTranslatedText('dateColumn'),
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: getTranslatedText('hoursUnit'),
                        color: textColor
                    },
                    ticks: {
                        beginAtZero: true,
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
};


// --- Admin Panel Functions ---

const renderAdminPanel = async () => {
    if (!loggedInUser || !loggedInUser.isAdmin) {
        showPage(mainDashboard);
        return;
    }
    showLoadingIndicator(true);
    try {
        await renderUsersTable();
        await renderAccountsTable();
        await renderTasksDefinitionTable();
        await populateRecordFilterUsers();
        await renderWorkRecordsTable(); // Initial load of work records
        await renderEmployeeRatesAndTotals(); // New function call
    } catch (error) {
        console.error("Error rendering admin panel:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Users
const renderUsersTable = async () => {
    usersTableBody.innerHTML = '';
    const usersCol = collection(db, 'users');
    const querySnapshot = await getDocs(orderBy(usersCol, 'name'));
    querySnapshot.docs.forEach(docSnap => {
        const user = getDocData(docSnap);
        const row = usersTableBody.insertRow();
        row.insertCell().textContent = user.name;
        row.insertCell().textContent = user.pin;
        const actionsCell = row.insertCell();
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = getTranslatedText('delete');
        deleteBtn.classList.add('action-btn', 'danger');
        deleteBtn.addEventListener('click', () => deleteUser(user.id, user.name));
        actionsCell.appendChild(deleteBtn);
    });
};

const addUser = async () => {
    const name = newUserNameInput.value.trim();
    const pin = newUserPINInput.value.trim();

    if (!name || !pin) {
        showToastMessage(getTranslatedText('fillAllFields'), 'error');
        return;
    }
    if (pin.length !== 8 || !/^\d+$/.test(pin)) {
        showToastMessage(getTranslatedText('pinLengthError'), 'error');
        return;
    }

    showLoadingIndicator(true);
    try {
        const usersCol = collection(db, 'users');
        await addDoc(usersCol, { name, pin, isAdmin: false }); // New users are not admin by default
        newUserNameInput.value = '';
        newUserPINInput.value = '';
        showToastMessage(getTranslatedText('userAdded'), 'success');
        await renderUsersTable();
        await populateRecordFilterUsers(); // Update user filter dropdown
    } catch (error) {
        console.error("Error adding user:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const deleteUser = async (userId, userName) => {
    if (!confirm(getTranslatedText('confirmDelete') + ` ${userName}?`)) return;

    showLoadingIndicator(true);
    try {
        await deleteDoc(doc(db, 'users', userId));
        showToastMessage(getTranslatedText('userDeleted'), 'success');
        await renderUsersTable();
        await populateRecordFilterUsers(); // Update user filter dropdown
    } catch (error) {
        console.error("Error deleting user:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Accounts
const renderAccountsTable = async () => {
    accountsTableBody.innerHTML = '';
    const accountsCol = collection(db, 'accounts');
    const querySnapshot = await getDocs(orderBy(accountsCol, 'name'));
    querySnapshot.docs.forEach(docSnap => {
        const account = getDocData(docSnap);
        const row = accountsTableBody.insertRow();
        row.insertCell().textContent = account.name;
        row.insertCell().textContent = (account.defaultPricePerHour || 0).toFixed(2); // Display default price
        const actionsCell = row.insertCell();
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = getTranslatedText('delete');
        deleteBtn.classList.add('action-btn', 'danger');
        deleteBtn.addEventListener('click', () => deleteAccount(account.id, account.name));
        actionsCell.appendChild(deleteBtn);
    });
};

const addAccount = async () => {
    const name = newAccountNameInput.value.trim();
    const defaultPrice = parseFloat(newAccountPriceInput.value);

    if (!name || isNaN(defaultPrice) || defaultPrice < 0) {
        showToastMessage(getTranslatedText('fillAllFields'), 'error');
        return;
    }

    showLoadingIndicator(true);
    try {
        const accountsCol = collection(db, 'accounts');
        await addDoc(accountsCol, { name, defaultPricePerHour: defaultPrice });
        newAccountNameInput.value = '';
        newAccountPriceInput.value = '';
        showToastMessage(getTranslatedText('accountAdded'), 'success');
        await renderAccountsTable();
        await populateAccountAndTaskSelects(); // Update account dropdowns in start work page
    } catch (error) {
        console.error("Error adding account:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const deleteAccount = async (accountId, accountName) => {
    if (!confirm(getTranslatedText('confirmDelete') + ` ${accountName}?`)) return;

    showLoadingIndicator(true);
    try {
        await deleteDoc(doc(db, 'accounts', accountId));
        showToastMessage(getTranslatedText('accountDeleted'), 'success');
        await renderAccountsTable();
        await populateAccountAndTaskSelects(); // Update account dropdowns
    } catch (error) {
        console.error("Error deleting account:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Tasks and Timings
const renderTasksDefinitionTable = async () => {
    tasksDefinitionTableBody.innerHTML = '';
    const tasksCol = collection(db, 'tasks');
    const querySnapshot = await getDocs(orderBy(tasksCol, 'name'));
    querySnapshot.docs.forEach(docSnap => {
        const task = getDocData(docSnap);
        const row = tasksDefinitionTableBody.insertRow();
        row.insertCell().textContent = task.name;
        
        const timingsCell = row.insertCell();
        if (task.timings && Object.keys(task.timings).length > 0) {
            // Display timings in MM:SS format
            const timingStrings = Object.values(task.timings).map(t => {
                const totalSeconds = t * 60;
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = Math.round(totalSeconds % 60);
                return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            });
            timingsCell.textContent = timingStrings.join(', ');
        } else {
            timingsCell.textContent = getTranslatedText('noTimings'); // Or empty
        }

        const actionsCell = row.insertCell();
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = getTranslatedText('delete');
        deleteBtn.classList.add('action-btn', 'danger');
        deleteBtn.addEventListener('click', () => deleteTask(task.id, task.name));
        actionsCell.appendChild(deleteBtn);
    });
};

const addTimingField = () => {
    const minutesInput = document.createElement('input');
    minutesInput.type = 'number';
    minutesInput.classList.add('new-task-timing-minutes');
    minutesInput.placeholder = getTranslatedText('minutesPlaceholder');
    minutesInput.min = '0';

    const secondsInput = document.createElement('input');
    secondsInput.type = 'number';
    secondsInput.classList.add('new-task-timing-seconds');
    secondsInput.placeholder = getTranslatedText('secondsPlaceholder');
    secondsInput.min = '0';
    secondsInput.max = '59';

    newTimingsContainer.appendChild(minutesInput);
    newTimingsContainer.appendChild(secondsInput);
};

const addTaskDefinition = async () => {
    const name = newTaskNameInput.value.trim();
    if (!name) {
        showToastMessage(getTranslatedText('fillAllFields'), 'error');
        return;
    }

    const timingInputsMinutes = newTimingsContainer.querySelectorAll('.new-task-timing-minutes');
    const timingInputsSeconds = newTimingsContainer.querySelectorAll('.new-task-timing-seconds');
    const timings = {};
    let hasValidTimings = false;

    timingInputsMinutes.forEach((minInput, index) => {
        const secInput = timingInputsSeconds[index];
        const minutes = parseInt(minInput.value);
        const seconds = parseInt(secInput.value);

        if (!isNaN(minutes) && minutes >= 0 && !isNaN(seconds) && seconds >= 0 && seconds < 60) {
            const totalMinutes = minutes + (seconds / 60);
            timings[`timing${index + 1}`] = totalMinutes;
            hasValidTimings = true;
        } else if (minInput.value !== '' || secInput.value !== '') { // If fields are not empty but invalid
            showToastMessage(getTranslatedText('invalidTime'), 'error');
            return; // Exit if invalid time is found
        }
    });

    if (!hasValidTimings) {
        showToastMessage(getTranslatedText('fillAllFields'), 'error'); // Or a more specific message
        return;
    }

    showLoadingIndicator(true);
    try {
        const tasksCol = collection(db, 'tasks');
        await addDoc(tasksCol, { name, timings });
        newTaskNameInput.value = '';
        newTimingsContainer.innerHTML = `
            <input type="number" class="new-task-timing-minutes" placeholder="${getTranslatedText('minutesPlaceholder')}" min="0" data-key="minutesPlaceholder">
            <input type="number" class="new-task-timing-seconds" placeholder="${getTranslatedText('secondsPlaceholder')}" min="0" max="59" data-key="secondsPlaceholder">
        `; // Reset to one pair
        showToastMessage(getTranslatedText('taskAdded'), 'success');
        await renderTasksDefinitionTable();
        await populateAccountAndTaskSelects(); // Update task dropdowns in start work page
    } catch (error) {
        console.error("Error adding task:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const deleteTask = async (taskId, taskName) => {
    if (!confirm(getTranslatedText('confirmDelete') + ` ${taskName}?`)) return;

    showLoadingIndicator(true);
    try {
        await deleteDoc(doc(db, 'tasks', taskId));
        showToastMessage(getTranslatedText('taskDeleted'), 'success');
        await renderTasksDefinitionTable();
        await populateAccountAndTaskSelects(); // Update task dropdowns
    } catch (error) {
        console.error("Error deleting task:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Work Records (Admin)
const populateRecordFilterUsers = async () => {
    recordFilterUser.innerHTML = '<option value="">' + getTranslatedText('allUsers') + '</option>';
    const usersCol = collection(db, 'users');
    const querySnapshot = await getDocs(orderBy(usersCol, 'name'));
    querySnapshot.docs.forEach(docSnap => {
        const user = getDocData(docSnap);
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        recordFilterUser.appendChild(option);
    });
};

const renderWorkRecordsTable = async () => {
    workRecordsTableBody.innerHTML = '';
    showLoadingIndicator(true);
    try {
        let q = collection(db, 'workRecords');

        const selectedDate = recordFilterDate.value;
        const selectedUser = recordFilterUser.value;

        let filters = [];
        if (selectedUser) {
            filters.push(where('userId', '==', selectedUser));
        }
        if (selectedDate) {
            const date = new Date(selectedDate);
            date.setHours(0, 0, 0, 0);
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);
            filters.push(where('timestamp', '>=', Timestamp.fromDate(date)));
            filters.push(where('timestamp', '<', Timestamp.fromDate(nextDay)));
        }

        q = query(q, ...filters, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            workRecordsTableBody.innerHTML = `<tr><td colspan="7">${getTranslatedText('noDataToShow')}</td></tr>`;
            return;
        }

        const usersMap = new Map();
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach(doc => usersMap.set(doc.id, doc.data().name));

        querySnapshot.docs.forEach(docSnap => {
            const record = getDocData(docSnap);
            const recordDate = record.timestamp.toDate();
            const formattedDate = recordDate.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US');
            const formattedTime = recordDate.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });

            const row = workRecordsTableBody.insertRow();
            row.insertCell().textContent = usersMap.get(record.userId) || 'Unknown User';
            row.insertCell().textContent = record.accountName;
            row.insertCell().textContent = record.taskName;
            row.insertCell().textContent = record.completedTasks;
            row.insertCell().textContent = record.totalTime.toFixed(2);
            row.insertCell().textContent = `${formattedDate} ${formattedTime}`;
            
            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.textContent = getTranslatedText('edit');
            editBtn.classList.add('action-btn', 'primary');
            editBtn.addEventListener('click', () => openEditRecordModal(record.id));
            actionsCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = getTranslatedText('delete');
            deleteBtn.classList.add('action-btn', 'danger');
            deleteBtn.addEventListener('click', () => deleteWorkRecord(record.id));
            actionsCell.appendChild(deleteBtn);
        });

    } catch (error) {
        console.error("Error rendering work records table:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const deleteWorkRecord = async (recordId) => {
    if (!confirm(getTranslatedText('confirmDelete'))) return;
    showLoadingIndicator(true);
    try {
        await deleteDoc(doc(db, 'workRecords', recordId));
        showToastMessage(getTranslatedText('recordDeleted'), 'success');
        await renderWorkRecordsTable();
    } catch (error) {
        console.error("Error deleting work record:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Edit Record Modal Functions
const openEditRecordModal = async (recordId) => {
    currentEditingRecordId = recordId;
    showLoadingIndicator(true);
    try {
        const recordDocRef = doc(db, 'workRecords', recordId);
        const recordDocSnap = await getDoc(recordDocRef);

        if (!recordDocSnap.exists()) {
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
            return;
        }
        const record = getDocData(recordDocSnap);

        // Populate Account Select
        editAccountSelect.innerHTML = '';
        const accountsCol = collection(db, 'accounts');
        const accountsSnapshot = await getDocs(accountsCol);
        accountsSnapshot.docs.forEach(doc => {
            const account = getDocData(doc);
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.name;
            editAccountSelect.appendChild(option);
        });
        editAccountSelect.value = record.accountId;

        // Populate Task Type Select
        editTaskTypeSelect.innerHTML = '';
        const tasksCol = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(tasksCol);
        tasksSnapshot.docs.forEach(doc => {
            const task = getDocData(doc);
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.name;
            editTaskTypeSelect.appendChild(option);
        });
        editTaskTypeSelect.value = record.taskTypeId;

        editTotalTasksCount.value = record.completedTasks;
        editTotalTime.value = record.totalTime.toFixed(2);

        const recordDate = record.timestamp.toDate();
        editRecordDate.value = recordDate.toISOString().split('T')[0];
        editRecordTime.value = recordDate.toTimeString().split(' ')[0].substring(0, 5);

        editRecordModal.style.display = 'flex'; // Show modal
    } catch (error) {
        console.error("Error opening edit modal:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const saveEditedRecord = async () => {
    if (!currentEditingRecordId) return;

    showLoadingIndicator(true);
    try {
        const docRef = doc(db, 'workRecords', currentEditingRecordId);

        const newAccountId = editAccountSelect.value;
        const newAccountName = editAccountSelect.options[editAccountSelect.selectedIndex].textContent;
        const newTaskTypeId = editTaskTypeSelect.value;
        const newTaskName = editTaskTypeSelect.options[editTaskTypeSelect.selectedIndex].textContent;
        const newCompletedTasks = parseInt(editTotalTasksCount.value);
        const newTotalTime = parseFloat(editTotalTime.value);
        const newDate = editRecordDate.value;
        const newTime = editRecordTime.value;

        if (isNaN(newCompletedTasks) || newCompletedTasks < 0 || isNaN(newTotalTime) || newTotalTime < 0 || !newAccountId || !newTaskTypeId || !newDate || !newTime) {
            showToastMessage(getTranslatedText('fillAllFields'), 'error');
            return;
        }

        const combinedDateTime = new Date(`${newDate}T${newTime}:00`);
        const newTimestamp = Timestamp.fromDate(combinedDateTime);

        // Fetch original details to potentially update them or keep them
        const originalRecordSnap = await getDoc(docRef);
        let originalDetails = originalRecordSnap.exists() ? originalRecordSnap.data().details || [] : [];
        
        // Simple update: We don't reconstruct details perfectly, just update totals
        // If detailed historical logging is critical, this part needs more complex logic
        // For now, we assume direct override of completedTasks and totalTime.
        // If details need to match the new totals, they would need to be regenerated or modified.
        // For this version, we'll keep existing details if present, otherwise, it's just totals.

        await updateDoc(docRef, {
            accountId: newAccountId,
            accountName: newAccountName,
            taskTypeId: newTaskTypeId,
            taskName: newTaskName,
            completedTasks: newCompletedTasks,
            totalTime: newTotalTime,
            timestamp: newTimestamp,
            details: originalDetails // Keep original details, or set to empty array if you want to clear them
        });

        showToastMessage(getTranslatedText('recordUpdated'), 'success');
        editRecordModal.style.display = 'none'; // Hide modal
        await renderWorkRecordsTable(); // Refresh table
    } catch (error) {
        console.error("Error saving edited record:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// --- New Admin Section: Employee Rates and Totals ---

const renderEmployeeRatesAndTotals = async () => {
    employeeRatesTableBody.innerHTML = '';
    showLoadingIndicator(true);
    try {
        const usersCol = collection(db, 'users');
        const usersSnapshot = await getDocs(orderBy(usersCol, 'name'));
        const users = usersSnapshot.docs.map(getDocData);

        const accountsCol = collection(db, 'accounts');
        const accountsSnapshot = await getDocs(orderBy(accountsCol, 'name'));
        const accounts = accountsSnapshot.docs.map(getDocData);
        const accountsMap = new Map(accounts.map(acc => [acc.id, acc])); // Map for quick lookup

        const workRecordsCol = collection(db, 'workRecords');
        const workRecordsSnapshot = await getDocs(workRecordsCol);
        const workRecords = workRecordsSnapshot.docs.map(getDocData);

        const userAccountRatesCol = collection(db, 'userAccountRates');
        const userAccountRatesSnapshot = await getDocs(userAccountRatesCol);
        const userAccountRates = userAccountRatesSnapshot.docs.map(getDocData);
        // Map custom rates: Map<userId, Map<accountId, {docId, customPricePerHour}>>
        const customRatesMap = new Map();
        userAccountRates.forEach(rate => {
            if (!customRatesMap.has(rate.userId)) {
                customRatesMap.set(rate.userId, new Map());
            }
            customRatesMap.get(rate.userId).set(rate.accountId, { docId: rate.id, customPricePerHour: rate.customPricePerHour });
        });

        const employeeWorkData = new Map(); // Map<userId, { totalHours: 0, totalBalance: 0, workedAccounts: Map<accountId, totalMinutes> }>

        workRecords.forEach(record => {
            if (!employeeWorkData.has(record.userId)) {
                employeeWorkData.set(record.userId, { totalHours: 0, totalBalance: 0, workedAccounts: new Map() });
            }
            const userData = employeeWorkData.get(record.userId);
            userData.totalHours += record.totalTime / 60; // Convert to hours
            userData.workedAccounts.set(record.accountId, (userData.workedAccounts.get(record.accountId) || 0) + record.totalTime); // Store total minutes per account

            // Calculate balance for this record using applicable price
            let pricePerHour = accountsMap.get(record.accountId)?.defaultPricePerHour || 0;
            if (customRatesMap.has(record.userId) && customRatesMap.get(record.userId).has(record.accountId)) {
                pricePerHour = customRatesMap.get(record.userId).get(record.accountId).customPricePerHour;
            }
            userData.totalBalance += (record.totalTime / 60) * pricePerHour;
        });

        users.forEach(user => {
            const userData = employeeWorkData.get(user.id) || { totalHours: 0, totalBalance: 0, workedAccounts: new Map() };

            if (userData.workedAccounts.size === 0) {
                // If user hasn't worked on any account, still display them but with no account details
                const row = employeeRatesTableBody.insertRow();
                row.insertCell().textContent = user.name;
                row.insertCell().colSpan = 3; // Span across account, default price, custom price
                row.insertCell().textContent = getTranslatedText('noDataToShow'); // Or "N/A"
                row.insertCell().textContent = ''; // Actions
                row.insertCell().textContent = userData.totalHours.toFixed(2);
                row.insertCell().textContent = `${userData.totalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')}`;
            } else {
                // Iterate through accounts the user has worked on
                userData.workedAccounts.forEach((totalMinutesForAccount, accountId) => {
                    const account = accountsMap.get(accountId);
                    if (!account) return; // Skip if account data is missing

                    let defaultPrice = account.defaultPricePerHour || 0;
                    let customRateData = customRatesMap.get(user.id)?.get(accountId);
                    let customPrice = customRateData?.customPricePerHour || null;
                    let customRateDocId = customRateData?.docId || null;

                    const row = employeeRatesTableBody.insertRow();
                    row.insertCell().textContent = user.name;
                    row.insertCell().textContent = account.name;
                    row.insertCell().textContent = defaultPrice.toFixed(2);
                    
                    const customPriceCell = row.insertCell();
                    customPriceCell.textContent = customPrice !== null ? customPrice.toFixed(2) : getTranslatedText('notSet');

                    const actionsCell = row.insertCell();
                    const modifyBtn = document.createElement('button');
                    modifyBtn.textContent = getTranslatedText('modify'); // Assuming 'modify' key exists
                    modifyBtn.classList.add('action-btn', 'primary');
                    modifyBtn.addEventListener('click', () => openEditEmployeeRateModal(user.id, user.name, account.id, account.name, defaultPrice, customPrice, customRateDocId));
                    actionsCell.appendChild(modifyBtn);

                    // These cells only show for the first account row of a user if user has multiple accounts
                    // Or total overall per user
                    // For simplicity, let's display totals per employee on their *first* row or the most relevant one
                    if (employeeWorkData.get(user.id).isFirstAccountRendered) {
                        row.insertCell().textContent = ''; // Placeholder
                        row.insertCell().textContent = ''; // Placeholder
                    } else {
                        row.insertCell().textContent = userData.totalHours.toFixed(2);
                        row.insertCell().textContent = `${userData.totalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')}`;
                        employeeWorkData.get(user.id).isFirstAccountRendered = true; // Mark as rendered
                    }
                });
            }
        });

    } catch (error) {
        console.error("Error rendering employee rates and totals:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const openEditEmployeeRateModal = (userId, userName, accountId, accountName, defaultPrice, customPrice, customRateDocId) => {
    currentEditingRate = { userId, accountId, docId: customRateDocId };

    modalEmployeeName.textContent = userName;
    modalAccountName.textContent = accountName;
    modalDefaultPrice.textContent = defaultPrice.toFixed(2);
    modalCustomPriceInput.value = customPrice !== null ? customPrice : defaultPrice; // Pre-fill with custom or default

    editEmployeeRateModal.style.display = 'flex';
};

const saveCustomRate = async () => {
    showLoadingIndicator(true);
    try {
        const customPrice = parseFloat(modalCustomPriceInput.value);
        if (isNaN(customPrice) || customPrice < 0) {
            showToastMessage(getTranslatedText('invalidPrice'), 'error'); // Need to add 'invalidPrice' translation
            return;
        }

        const rateData = {
            userId: currentEditingRate.userId,
            accountId: currentEditingRate.accountId,
            customPricePerHour: customPrice,
            timestamp: Timestamp.now()
        };

        if (currentEditingRate.docId) {
            // Update existing custom rate
            const docRef = doc(db, 'userAccountRates', currentEditingRate.docId);
            await updateDoc(docRef, rateData);
        } else {
            // Add new custom rate
            await addDoc(collection(db, 'userAccountRates'), rateData);
        }

        showToastMessage(getTranslatedText('rateUpdated'), 'success');
        editEmployeeRateModal.style.display = 'none';
        await renderEmployeeRatesAndTotals(); // Refresh the table
    } catch (error) {
        console.error("Error saving custom rate:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};


// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Content Loaded.");
    checkConnectionStatus();
    loadDarkModePreference();
    setLanguage(currentLanguage); // Apply initial language translations

    // Login PIN inputs logic
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
            if (pinInputs.every(i => i.value.length === 1)) {
                // All 8 digits entered, attempt login
                const fullPin = pinInputs.map(i => i.value).join('');
                login(fullPin);
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && input.value.length === 0 && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });

    // Check for logged-in user on load
    const storedUserId = localStorage.getItem('loggedInUserId');
    const storedUserIsAdmin = localStorage.getItem('loggedInUserIsAdmin') === 'true';
    if (storedUserId) {
        showLoadingIndicator(true);
        try {
            const userDocRef = doc(db, 'users', storedUserId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                loggedInUser = getDocData(userDocSnap);
                loggedInUser.isAdmin = storedUserIsAdmin; // Ensure isAdmin status is maintained
                await goToDashboard();
            } else {
                logout(); // User not found, log out
            }
        } catch (error) {
            console.error("Error loading stored user:", error);
            logout();
        } finally {
            showLoadingIndicator(false);
        }
    } else {
        showPage(loginPage);
        pinInputs[0].focus(); // Focus on the first PIN input
    }

    // Main Dashboard Buttons
    logoutDashboardBtn.addEventListener('click', logout);
    startWorkOption.addEventListener('click', goToStartWork);
    trackWorkOption.addEventListener('click', goToTrackWork);
    // Assuming you have an admin button or way to access it
    // For now, let's add a placeholder admin option for testing
    // You'd integrate this into your HTML appropriately, e.g., only show if isAdmin
    const adminLink = document.createElement('button');
    adminLink.textContent = getTranslatedText('adminPanelTitle');
    adminLink.classList.add('big-option-btn');
    adminLink.addEventListener('click', goToAdminPanel);
    mainDashboard.querySelector('.dashboard-options').appendChild(adminLink);


    // Start Work Page Buttons
    confirmSelectionBtn.addEventListener('click', handleConfirmSelection);
    backToDashboardFromPopup.addEventListener('click', goToDashboard);
    saveWorkBtn.addEventListener('click', saveWorkRecord);
    backToDashboardFromStartWork.addEventListener('click', goToDashboard);

    // Track Work Page Buttons
    backToDashboardFromTrack.addEventListener('click', goToDashboard);

    // Admin Panel Buttons
    addUserBtn.addEventListener('click', addUser);
    addAccountBtn.addEventListener('click', addAccount);
    addTimingFieldBtn.addEventListener('click', addTimingField); // Add initial timing field handler
    addTaskDefinitionBtn.addEventListener('click', addTaskDefinition);
    filterRecordsBtn.addEventListener('click', renderWorkRecordsTable);
    logoutAdminBtn.addEventListener('click', logout);

    // Edit Record Modal
    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', () => editRecordModal.style.display = 'none');
    }
    saveEditedRecordBtn.addEventListener('click', saveEditedRecord);

    // Edit Employee Rate Modal
    editEmployeeRateModal.querySelector('.close-button').addEventListener('click', () => editEmployeeRateModal.style.display = 'none');
    saveCustomRateBtn.addEventListener('click', saveCustomRate);


    // Connection Status Events
    window.addEventListener('online', () => {
        showToastMessage(getTranslatedText('internetRestored'), 'success');
    });
    window.addEventListener('offline', () => {
        showToastMessage(getTranslatedText('internetLost'), 'error');
    });

    // Language buttons
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

    // Dark mode toggle
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
});
