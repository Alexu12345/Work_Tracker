// دالة لتحويل الدقائق الكلية إلى نص عربي (10س 30د 30ث)
function formatTotalMinutesToArabicText(totalMinutes) {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '0س 0د 0ث';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.round((totalMinutes % 1) * 60);
    return `${hours}س ${minutes}د ${seconds}ث`;
}

// --- [تعريف عناصر سجل المدفوعات في الأعلى لتفادي ReferenceError] ---
const paymentsLogPage = document.getElementById('paymentsLogPage');
const gotoPaymentsLogBtn = document.getElementById('gotoPaymentsLogBtn');
const backToLeaderPayrollBtn = document.getElementById('backToLeaderPayrollBtn');
const paymentsLogMonthFilter = document.getElementById('paymentsLogMonthFilter');
const paymentsLogAccountFilter = document.getElementById('paymentsLogAccountFilter');
const paymentsLogUserFilter = document.getElementById('paymentsLogUserFilter');
const paymentsLogStatusFilter = document.getElementById('paymentsLogStatusFilter');
const paymentsLogFilterBtn = document.getElementById('paymentsLogFilterBtn');
const paymentsLogTableBody = document.getElementById('paymentsLogTableBody');
const globalMonthFilter = document.getElementById('globalMonthFilter');

// ربط الفلتر العام بجدول أسعار الموظفين والإجماليات
if (globalMonthFilter) {
    globalMonthFilter.addEventListener('change', () => {
        if (typeof renderEmployeeRatesAndTotals === 'function') {
            renderEmployeeRatesAndTotals(globalMonthFilter.value);
        }
    });
}

async function loadPaymentsLogFilters() {
    // تحميل الحسابات والمستخدمين للفلاتر
    paymentsLogAccountFilter.innerHTML = `<option value="all">${getTranslatedText('allAccounts')}</option>`;
    allAccounts.forEach(acc => {
        paymentsLogAccountFilter.innerHTML += `<option value="${acc.id}">${acc.name}</option>`;
    });
    paymentsLogUserFilter.innerHTML = `<option value="all">${getTranslatedText('allUsers')}</option>`;
    allUsers.forEach(u => {
        paymentsLogUserFilter.innerHTML += `<option value="${u.id}">${u.name}</option>`;
    });
}

async function loadPaymentsLogTable() {
    paymentsLogTableBody.innerHTML = '<tr><td colspan="7">'+getTranslatedText('loading')+'</td></tr>';
    const paymentsCol = collection(db, 'payments');
    const snapshot = await getDocs(paymentsCol);
    let rows = [];
    const monthVal = paymentsLogMonthFilter.value;
    const accVal = paymentsLogAccountFilter.value;
    const userVal = paymentsLogUserFilter.value;
    const statusVal = paymentsLogStatusFilter.value;
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // month: yyyy-mm
        if (monthVal && monthVal !== '' && data.month !== monthVal) return;
        if (accVal && accVal !== 'all' && data.accountId !== accVal) return;
        if (userVal && userVal !== 'all' && data.userId !== userVal) return;
        if (statusVal && statusVal !== 'all' && data.status !== statusVal) return;
        rows.push({id: docSnap.id, ...data});
    });
    if (rows.length === 0) {
        paymentsLogTableBody.innerHTML = `<tr><td colspan="7">${getTranslatedText('noDataToShow')}</td></tr>`;
        return;
    }
    paymentsLogTableBody.innerHTML = rows.map(row => {
        const user = allUsers.find(u => u.id === row.userId || u.id === (row.userId && row.userId.replace(/(_1|_2)$/,'')));
        const acc = allAccounts.find(a => a.id === row.accountId);
        // نوع الحساب نصي
        let accountTypeText = '';
        if (row.accountType === 1) accountTypeText = getTranslatedText('acctype1');
        else if (row.accountType === 2) accountTypeText = getTranslatedText('acctype2');
        else if (acc && acc.acctype === 1) accountTypeText = getTranslatedText('acctype1');
        else if (acc && acc.acctype === 2) accountTypeText = getTranslatedText('acctype2');
        else accountTypeText = '-';
        const statusClass = row.status === 'paid' ? 'payment-status-paid' : 'payment-status-pending';
        return `<tr>
            <td>${user ? user.name : ''}</td>
            <td>${acc ? acc.name : ''}</td>
            <td>${accountTypeText}</td>
            <td>${row.taskName || ''}</td>
            <td>${row.totalTime || ''}</td>
            <td>${row.date || row.month || ''}</td>
            <td><span class="${statusClass}">${getTranslatedText(row.status === 'paid' ? 'paidStatus' : 'pendingStatus')}</span></td>
        </tr>`;
    }).join('');
}

if (paymentsLogPage) {
    paymentsLogPage.addEventListener('show', async () => {
        await loadPaymentsLogFilters();
        await loadPaymentsLogTable();
    });
    if (paymentsLogFilterBtn) {
        paymentsLogFilterBtn.onclick = loadPaymentsLogTable;
    }
}

// عند التنقل للصفحة، فعّل الحدث
if (gotoPaymentsLogBtn) {
    gotoPaymentsLogBtn.onclick = async () => {
        showPage(paymentsLogPage);
        applyTranslations();
        await loadPaymentsLogFilters();
        await loadPaymentsLogTable();
    };
}
// --- [منطق التنقل بين لوحة القائد وسجل المدفوعات] ---
// (تم نقل تعريف العناصر للأعلى، ويكفي استخدام التعريفات الأولى فقط)
// استخدام الدالة showPage الأصلية فقط
if (gotoPaymentsLogBtn) {
    gotoPaymentsLogBtn.onclick = () => {
        showPage(paymentsLogPage);
        applyTranslations();
        // تحميل بيانات المدفوعات عند الدخول (سيتم إضافة المنطق لاحقاً)
    };
}
if (backToLeaderPayrollBtn) {
    backToLeaderPayrollBtn.onclick = () => {
        showPage(adminPanelPage);
        applyTranslations();
    };
}


// إظهار الفلتر العام فقط بعد الدخول
function showGlobalMonthFilter(show) {
    const filterContainer = document.getElementById('globalMonthFilterContainer');
    if (filterContainer) {
        if (show) {
            filterContainer.style.display = 'block';
        } else {
            filterContainer.style.display = 'none';
        }
    }
}

// عند الدخول (نجاح تسجيل الدخول أو استئناف جلسة)
function afterLoginShowPages() {
    showGlobalMonthFilter(true);
    // إعادة ضبط قيمة الفلتر العام للشهر الحالي إذا لم تكن محددة
    if (globalMonthFilter && !globalMonthFilter.value) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const monthStr = month < 10 ? '0' + month : '' + month;
        globalMonthFilter.value = now.getFullYear() + '-' + monthStr;
    }
    // ... أي منطق آخر بعد الدخول ...
}

// عند تسجيل الخروج
function afterLogoutHidePages() {
    showGlobalMonthFilter(false);
    // ... أي منطق آخر بعد الخروج ...
}

// ...existing code...

// استدعِ afterLoginShowPages() بعد نجاح تسجيل الدخول أو استئناف الجلسة
// استدعِ afterLogoutHidePages() عند تسجيل الخروج

// مثال: بعد تسجيل الدخول الناجح
// ...
// await saveSession(loggedInUser);
// afterLoginShowPages();
// showPage(mainDashboard);
// ...

// مثال: عند تسجيل الخروج
// ...
// await clearSession();
// afterLogoutHidePages();
// showPage(loginPage);
// ...
// ...existing code...
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, collection, getDocs, setDoc, updateDoc, deleteDoc, query, where, limit, Timestamp, serverTimestamp, addDoc, orderBy, onSnapshot, startAfter } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
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
let loggedInUser = null; // Stores current user data { id, name, role }
let allAccounts = []; // Stores all account definitions from Firestore
let allTaskDefinitions = []; // Stores all task definitions from Firestore
let allUsers = []; // Stores all user definitions from Firestore
let selectedAccount = null; 
let selectedTaskDefinition = null; 
let currentSessionTasks = []; 
let isSavingWork = false; 
let lastClickTime = null; 

// Firestore unsubscribe functions
let unsubscribeUsers = null; 

// In-memory cache for work records per user to enable instant month filtering
const userWorkRecordsCache = new Map(); // Map<userId, Array<workRecord>>
// Global cache for all work records (used by admin summaries)
let allWorkRecordsCache = null; // Array<workRecord> | null
// Constants
const SESSION_DURATION_MS = 3 * 60 * 60 * 1000; 
const SESSION_CLOSED_BROWSER_MS = 1 * 60 * 60 * 1000; 
const USER_ONLINE_THRESHOLD_MS = 60 * 1000; 
const USER_RECENTLY_ONLINE_THRESHOLD_MS = 5 * 60 * 1000; 
const RECORDS_PER_PAGE = 50; 

// DOM Elements
const loginPage = document.getElementById('loginPage');
const mainDashboard = document.getElementById('mainDashboard');
const startWorkPage = document.getElementById('startWorkPage');
const trackWorkPage = document.getElementById('trackWorkPage');
const adminPanelPage = document.getElementById('adminPanelPage');

// --- [تعديل جديد: عناصر فلاتر الشهر] ---
const dashboardMonthFilter = document.getElementById('dashboardMonthFilter');
const trackMonthFilter = document.getElementById('trackMonthFilter');
const adminRatesMonthFilter = document.getElementById('adminRatesMonthFilter');
// ---------------------------------------

// Login Page Elements
const pinInputs = [];
for (let i = 1; i <= 8; i++) {
    pinInputs.push(document.getElementById(`pinInput${i}`));
}

// Main Dashboard Elements
const userNameDisplay = document.getElementById('userNameDisplay');
const totalHoursDisplay = document.getElementById('totalHoursDisplay');
const totalBalanceDisplay = document.getElementById('totalBalanceDisplay'); 
const startWorkOptionBtn = document.getElementById('startWorkOption');
const trackWorkOptionBtn = document.getElementById('trackWorkOption');
const logoutDashboardBtn = document.getElementById('logoutDashboardBtn'); 
let adminPanelButton = null; 

// Track Work Page Elements
const taskChartCanvas = document.getElementById('taskChart'); 
let taskChart = null; 
const trackTasksTableBody = document.getElementById('trackTasksTableBody');
const trackTasksTableFoot = document.getElementById('trackTasksTableFoot'); 
const backToDashboardFromTrackBtn = document.getElementById('backToDashboardFromTrack');

// Start Work Page Elements
const taskSelectionPopup = document.getElementById('taskSelectionPopup');
const accountSelect = document.getElementById('accountSelect');
const taskTypeSelect = document.getElementById('taskTypeSelect');
const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');
const backToDashboardFromPopup = document.getElementById('backToDashboardFromPopup'); 
const completedTasksCount = document.getElementById('completedTasksCount');
const recordedTotalTime = document.getElementById('recordedTotalTime');
const detailedSummaryContainer = document.getElementById('detailedSummaryContainer'); 
const taskTimingButtonsContainer = document.getElementById('taskTimingButtonsContainer'); 
const saveWorkBtn = document.getElementById('saveWorkBtn');
const backToDashboardFromStartWork = document.getElementById('backToDashboardFromStartWork'); 
const taskDetailsContainer = document.getElementById('taskDetailsContainer'); 

// Admin Panel Elements - Users
const newUserNameInput = document.getElementById('newUserNameInput');
const newUserPINInput = document.getElementById('newUserPINInput');
const addUserBtn = document.getElementById('addUserBtn');
const usersTableBody = document.getElementById('usersTableBody');
const newUserNameInputError = document.getElementById('newUserNameInputError');
const newUserPINInputError = document.getElementById('newUserPINInputError');

// Admin Panel Elements - Accounts
const newAccountNameInput = document.getElementById('newAccountNameInput');
const newAccountPriceInput = document.getElementById('newAccountPriceInput'); 
const addAccountBtn = document.getElementById('addAccountBtn');
const accountsTableBody = document.getElementById('accountsTableBody');
const newAccountNameInputError = document.getElementById('newAccountNameInputError');
const newAccountPriceInputError = document.getElementById('newAccountPriceInputError');
const newAccountTypeSelect = document.getElementById('newAccountTypeSelect');
const newAccountTypeInputError = document.getElementById('newAccountTypeInputError');

// Admin Panel Elements - Task Definitions
const newTaskNameInput = document.getElementById('newTaskNameInput');
const newTimingsContainer = document.getElementById('newTimingsContainer');
const addTimingFieldBtn = document.getElementById('addTimingFieldBtn');
const addTaskDefinitionBtn = document.getElementById('addTaskDefinitionBtn');
const tasksDefinitionTableBody = document.getElementById('tasksDefinitionTableBody');
const newTaskNameInputError = document.getElementById('newTaskNameInputError');
const newTimingsInputError = document.getElementById('newTimingsInputError');

// Admin Panel Elements - Work Records
const recordFilterDate = document.getElementById('recordFilterDate');
const recordFilterUser = document.getElementById('recordFilterUser');
const recordFilterAccount = document.getElementById('recordFilterAccount'); 
const recordFilterTask = document.getElementById('recordFilterTask'); 
const filterRecordsBtn = document.getElementById('filterRecordsBtn');
const workRecordsTableBody = document.getElementById('workRecordsTableBody');
const loadMoreRecordsBtn = document.getElementById('loadMoreRecordsBtn'); 
const loadAllRecordsBtn = document.getElementById('loadAllRecordsBtn'); 
let lastVisibleRecord = null; 
let allRecordsLoaded = false; 

// Edit Record Modal Elements
const editRecordModal = document.getElementById('editRecordModal');
const closeEditRecordModalBtn = editRecordModal.querySelector('.close-button');
const editAccountSelect = document.getElementById('editAccountSelect');
const editTaskTypeSelect = document.getElementById('editTaskTypeSelect');
const editTotalTasksCount = document.getElementById('editTotalTasksCount');
const editTotalTime = document.getElementById('editTotalTime');
const editRecordDate = document.getElementById('editRecordDate'); 
const editRecordTime = document.getElementById('editRecordTime'); 
const saveEditedRecordBtn = document.getElementById('saveEditedRecordBtn');
let currentEditingRecordId = null; 
const editAccountSelectError = document.getElementById('editAccountSelectError');
const editTaskTypeSelectError = document.getElementById('editTaskTypeSelectError');
const editTotalTasksCountError = document.getElementById('editTotalTasksCountError');
const editTotalTimeError = document.getElementById('editTotalTimeError');
const editRecordDateError = document.getElementById('editRecordDateError');
const editRecordTimeError = document.getElementById('editRecordTimeError');

// Admin Panel Elements for Employee Rates
const employeeRatesTableBody = document.getElementById('employeeRatesTableBody');
const editEmployeeRateModal = document.getElementById('editEmployeeRateModal');
const modalEmployeeName = document.getElementById('modalEmployeeName');
const modalAccountName = document.getElementById('modalAccountName');
const modalDefaultPrice = document.getElementById('modalDefaultPrice');
const modalCustomPriceInput = document.getElementById('modalCustomPriceInput');
const saveCustomRateBtn = document.getElementById('saveCustomRateBtn');
let currentEditingRate = { userId: null, accountId: null, docId: null };
const modalCustomPriceInputError = document.getElementById('modalCustomPriceInputError');
// Leader Payroll Elements
const leaderPayrollTableBody = document.getElementById('leaderPayrollTableBody');

// Edit Account Modal Elements
const editAccountModal = document.getElementById('editAccountModal');
const closeEditAccountModalBtn = document.getElementById('closeEditAccountModal');
const editAccountNameInput = document.getElementById('editAccountNameInput');
const editAccountPriceInput = document.getElementById('editAccountPriceInput');
const editAccountTypeSelect = document.getElementById('editAccountTypeSelect');
const saveEditedAccountBtn = document.getElementById('saveEditedAccountBtn');
const cancelEditAccountBtn = document.getElementById('cancelEditAccountBtn');
const editAccountNameError = document.getElementById('editAccountNameError');
const editAccountPriceError = document.getElementById('editAccountPriceError');
const editAccountTypeError = document.getElementById('editAccountTypeError');
let currentEditingAccountId = null;

// Common Elements
const logoutAdminBtn = document.getElementById('logoutAdminBtn');
const toastMessage = document.getElementById('toastMessage');
const loadingIndicator = document.getElementById('loadingIndicator');
const langArBtn = document.getElementById('langArBtn');
const langEnBtn = document.getElementById('langEnBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = darkModeToggle ? darkModeToggle.querySelector('i') : null;

// Modals
const loginErrorModal = document.getElementById('loginErrorModal');
const loginErrorModalTitle = document.getElementById('loginErrorModalTitle');
const loginErrorModalMessage = document.getElementById('loginErrorModalMessage');
const closeLoginErrorModalBtn = document.getElementById('closeLoginErrorModal');
const loginErrorModalCloseBtn = document.getElementById('loginErrorModalCloseBtn');
const confirmationModal = document.getElementById('confirmationModal');
const confirmationModalTitle = document.getElementById('confirmationModalTitle');
const confirmationModalMessage = document.getElementById('confirmationModalMessage');
const confirmModalBtn = document.getElementById('confirmModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
let confirmCallback = null; 
let cancelCallback = null; 

// --- [دوال مساعدة جديدة للفلاتر] ---
// دالة لجلب الشهر الحالي بتنسيق YYYY-MM
const getCurrentMonthValue = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

// دالة لضبط قيمة الفلاتر للشهر الحالي عند البداية
const initMonthFilters = () => {
    const currentMonth = getCurrentMonthValue();
    if (dashboardMonthFilter) dashboardMonthFilter.value = currentMonth;
    if (trackMonthFilter) trackMonthFilter.value = currentMonth;
    if (adminRatesMonthFilter) adminRatesMonthFilter.value = currentMonth;
    if (globalMonthFilter) globalMonthFilter.value = currentMonth;
};

// Given an array of workRecords, return sorted unique months (YYYY-MM) descending
const extractMonthsFromRecords = (records) => {
    if (!records || !Array.isArray(records)) return [];
    const set = new Set();
    records.forEach(r => {
        const m = getRecordMonthValue(r);
        if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
};

// Choose best month (current if has data, else last active) and apply to all month inputs
const applyBestMonthFromRecords = (records) => {
    const months = extractMonthsFromRecords(records);
    const current = getCurrentMonthValue();
    let chosen = current;
    if (months.length === 0) {
        chosen = current;
    } else {
        if (months.includes(current)) chosen = current;
        else chosen = months[0];
    }
    if (globalMonthFilter) globalMonthFilter.value = chosen;
    if (dashboardMonthFilter) dashboardMonthFilter.value = chosen;
    if (trackMonthFilter) trackMonthFilter.value = chosen;
    if (adminRatesMonthFilter) adminRatesMonthFilter.value = chosen;
};
// ---------------------------------------

// Helper: get record's month in YYYY-MM format (handles Firestore Timestamp or JS Date)
const getRecordMonthValue = (record) => {
    if (!record || !record.timestamp) return null;
    let dateObj;
    try {
        // Firestore Timestamp has toDate()
        if (typeof record.timestamp.toDate === 'function') dateObj = record.timestamp.toDate();
        else dateObj = new Date(record.timestamp);
    } catch (e) {
        dateObj = new Date(record.timestamp);
    }
    if (isNaN(dateObj.getTime())) return null;
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

// Helper: filter an array of workRecords by YYYY-MM value. Use 'all' to return original array.
const filterRecordsByMonth = (records, yyyyMM) => {
    if (!records || !Array.isArray(records)) return [];
    if (!yyyyMM || yyyyMM === 'all') return records.slice();
    return records.filter(r => getRecordMonthValue(r) === yyyyMM);
};

// Utility Functions
const getDocData = (documentSnapshot) => {
    if (documentSnapshot.exists()) {
        return { id: documentSnapshot.id, ...documentSnapshot.data() };
    }
    return null;
};

const showPage = (pageElement) => {
    const pages = [loginPage, mainDashboard, startWorkPage, trackWorkPage, adminPanelPage];
    pages.forEach(p => p.style.display = 'none'); 
    pageElement.style.display = 'flex'; 

    // إظهار أو إخفاء الفلتر العام حسب الصفحة
    const filterContainer = document.getElementById('globalMonthFilterContainer');
    if (filterContainer) {
        if (pageElement === loginPage) {
            filterContainer.style.display = 'none';
        } else {
            filterContainer.style.display = 'block';
        }
    }

    if (pageElement !== startWorkPage) {
        taskSelectionPopup.style.display = 'none';
    }
    editRecordModal.style.display = 'none'; 
    editEmployeeRateModal.style.display = 'none'; 
    loginErrorModal.style.display = 'none'; 
    confirmationModal.style.display = 'none'; 
};

const showToastMessage = (message, type) => {
    toastMessage.textContent = message;
    toastMessage.className = `toast-message ${type}`; 
    toastMessage.style.display = 'block';
    void toastMessage.offsetWidth;
    toastMessage.classList.add('show');

    setTimeout(() => {
        toastMessage.classList.remove('show');
        toastMessage.addEventListener('transitionend', function handler() {
            toastMessage.style.display = 'none';
            toastMessage.removeEventListener('transitionend', handler);
        }, { once: true });
    }, 3000); 
};

function showLoadingIndicator(show) { 
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

const showConfirmationModal = (message, onConfirm, onCancel, titleKey = 'confirmAction') => {
    confirmationModalTitle.textContent = getTranslatedText(titleKey);
    confirmationModalMessage.textContent = message;
    confirmationModal.style.display = 'flex'; 

    confirmCallback = onConfirm;
    cancelCallback = onCancel;
};

confirmModalBtn.addEventListener('click', () => {
    confirmationModal.style.display = 'none';
    if (confirmCallback) confirmCallback();
});

cancelModalBtn.addEventListener('click', () => {
    confirmationModal.style.display = 'none';
    if (cancelCallback) cancelCallback();
});

window.addEventListener('click', (event) => {
    if (event.target === confirmationModal) {
        confirmationModal.style.display = 'none';
        if (cancelCallback) cancelCallback();
    }
});

document.getElementById('closeConfirmationModal').addEventListener('click', () => {
    confirmationModal.style.display = 'none';
    if (cancelCallback) cancelCallback();
});

const showInputError = (inputElement, errorMessageElement, messageKey) => {
    inputElement.classList.add('is-invalid');
    errorMessageElement.textContent = getTranslatedText(messageKey);
    errorMessageElement.classList.add('show');
};

const clearInputError = (inputElement, errorMessageElement) => {
    inputElement.classList.remove('is-invalid');
    errorMessageElement.textContent = '';
    errorMessageElement.classList.remove('show');
};

const checkConnectionStatus = () => {
    if (!navigator.onLine) {
        showToastMessage(getTranslatedText('noInternet'), 'error');
    }
};

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
    if (taskChart) renderTrackWorkPage(); 
    applyTranslations();
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

const formatMinutesToMMSS = (decimalMinutes) => {
    if (isNaN(decimalMinutes) || decimalMinutes < 0) return '00:00';
    const totalSeconds = Math.round(decimalMinutes * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (seconds === 60) return `${minutes + 1}:00`;
    const formattedMinutes = String(minutes).padStart(1, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
};

const formatTotalMinutesToHHMMSS = (totalMinutes) => {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '00:00:00';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.round((totalMinutes % 1) * 60);
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

const getMaxTimingForTask = (taskDefinitionId) => {
    const task = allTaskDefinitions.find(t => t.id === taskDefinitionId);
    if (task && task.timings && task.timings.length > 0) {
        return Math.max(...task.timings); 
    }
    return 0; 
};

// Language Support (Updated with new keys for Month Filters)
const translations = {
    // تمت مراجعة جميع مفاتيح data-key في index.html وإضافة أي مفاتيح ناقصة هنا
    'ar': {
        'loginTitle': 'تسجيل الدخول',
        'pinPlaceholder': 'أدخل رمز PIN',
        'loginBtn': 'دخول',
        'pinError': 'الرجاء إدخال رمز PIN مكون من 8 أرقام فقط.',
        'pinIncorrect': 'رمز PIN غير صحيح. الرجاء المحاولة مرة أخرى.',
        'loginError': 'حدث خطأ أثناء تسجيل الدخول. الرجاء المحاولة لاحقاً.',
        'admin': 'المدير',
        'leader': 'القائد',
        'totalHoursTitle': 'إجمالي ساعات العمل:',
        'hoursUnit': 'ساعة',
        'totalBalanceTitle': 'إجمالي الرصيد:',
        'currencyUnit': '$',
        // توحيد العملة للجنيه المصري
        'currencyUnit': '$',
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
        'serialColumn': 'المسلسل',
        'dateColumn': 'التاريخ',
        'dailyTotalTimeColumn': 'إجمالي اليوم',
        'timingValueColumn': 'التوقيت (دقيقة)',
        'taskTimingsSummary': 'ملخص توقيتات المهمة',
        'totalForTaskColumn': 'إجمالي المهمة',
        'totalForAccountColumn': 'إجمالي الحساب',
        'taskColumn': 'المهمة',
        'totalTimeMinutesColumn': 'إجمالي الوقت (دقيقة)',
        'completedTasksColumn': 'عدد المهام المنجزة',
        'noDataToShow': 'لا توجد بيانات لعرضها',
        'adminPanelTitle': 'لوحة تحكم المدير',
        'manageUsers': 'إدارة المستخدمين',
        'newUserName': 'اسم المستخدم الجديد',
        'newUserPIN': 'رمز PIN للمستخدم (8 أرقام)',
        'addUserBtn': 'إضافة مستخدم',
        'currentUsers': 'المستخدمون الحاليون:',
        'nameColumn': 'الاسم',
        'pinColumn': 'PIN',
        'statusColumn': 'الحالة', 
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
        'defaultPricePlaceholder': 'السعر الافتراضي للساعة (دولار)', 
        'addAccountBtn': 'إضافة حساب',
        'gotoadmindashbourd': 'لوحة المستخدمين',
        'currentAccounts': 'الحسابات الحالية:',
        'accountNameColumn': 'اسم الحساب',
        'defaultPriceColumn': 'السعر الافتراضي/ساعة', 
        'confirmDeleteAccount': 'هل أنت متأكد من حذف الحساب {name}؟',
        'accountDeletedSuccess': 'تم حذف الحساب بنجاح.',
        'enterAccountName': 'الرجاء إدخال اسم الحساب.',
        'accountExists': 'اسم الحساب هذا موجود بالفعل. الرجاء اختيار اسم آخر.',
        'accountAddedSuccess': 'تم إضافة الحساب بنجاح!',
        'errorAddingAccount': 'حدث خطأ أثناء إضافة الحساب.',
        'manageTasks': 'إدارة المهام والتوقيتات',
        'newTaskName': 'اسم المهمة الجديدة',
        'timingPlaceholder': 'التوقيت (بالدقائق)',
        'minutesPlaceholder': 'دقائق', 
        'secondsPlaceholder': 'ثواني', 
        'addTimingField': 'إضافة حقل توقيت',
        'addTaskBtn': 'إضافة مهمة جديدة',
        'currentTasks': 'المهام الحالية:',
        'taskNameColumn': 'المهمة',
        'timingsColumn': 'التوقيتات (دقائق:ثواني)', 
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
        'timeColumn': 'الوقت',
        'confirmDeleteRecord': 'هل أنت متأكد من حذف هذا السجل للمستخدم {name}؟',
        'recordDeletedSuccess': 'تم حذف السجل بنجاح.',
        'errorDeletingRecord': 'حدث خطأ أثناء حذف السجل.',
        'editRecord': 'تعديل',
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
        'grandTotal': 'الإجمالي الكلي',
        'totalTasksOverall': 'إجمالي عدد المهام',
        'totalTimeOverall': ' الوقت',
        'totalBalanceOverall': ' الرصيد',
        'sessionWarning': 'ستنتهي جلستك بعد {duration} أو {closedBrowserDuration} من إغلاق المتصفح. هل ترغب في تسجيل الخروج الآن؟', 
        'manageEmployeeRates': 'إدارة أسعار الموظفين والإجماليات', 
        'employeeNameColumn': 'الموظف', 
        'customPriceColumn': 'السعر المخصص/ساعة', 
        'employeeTotalHoursColumn': 'إجمالي الساعات', 
        'employeeTotalBalanceColumn': 'إجمالي الرصيد المستحق', 
        'paymentsLogTitle': 'سجل المدفوعات',
        'monthColumn': 'الشهر',
        'allStatuses': 'كل الحالات',
        'editCustomRateTitle': 'تعديل السعر المخصص', 
        'editAccountTitle': 'تعديل الحساب',
        'employeeNameLabel': 'الموظف:', 
        'accountNameLabel': 'الحساب:', 
        'defaultPriceLabel': 'السعر الافتراضي:', 
        'customPriceInputLabel': 'السعر المخصص (دولار):', 
        'rateUpdated': 'تم تحديث السعر المخصص بنجاح.', 
        'invalidTime': 'يرجى إدخال قيم صالحة للدقائق والثواني.', 
        'invalidPrice': 'يرجى إدخال سعر صالح.', 
        'modify': 'تعديل', 
        'notSet': 'غير محدد', 
        'unauthorizedAccess': 'وصول غير مصرح به. يرجى تسجيل الدخول كمسؤول.', 
        'error': 'خطأ', 
        'close': 'إغلاق', 
        'accountTotalTimeColumnShort': 'وقت الحساب', 
        'accountBalanceColumn': 'رصيد الحساب', 
        'timeSinceLastClick': 'آخر نقرة منذ {minutes} دقيقة و {seconds} ثانية.', 
        'tasksSummaryTooltip': '{count} مهمات بـ {time} دقائق', 
        'confirmAction': 'تأكيد الإجراء', 
        'cancelBtn': 'إلغاء', 
        'allAccounts': 'جميع الحسابات', 
        'allTasks': 'جميع المهام', 
        'requiredField': 'هذا الحقل مطلوب.', 
        'invalidPinLength': 'يجب أن يتكون رمز PIN من 8 أرقام.', 
        'invalidNumber': 'الرجاء إدخال رقم صالح.', 
        'invalidTimeInput': 'الرجاء إدخال قيم صحيحة للدقائق والثواني.', 
        'saving': 'جارٍ الحفظ...', 
        'deleting': 'جارٍ الحذف...', 
        'adding': 'جارٍ الإضافة...', 
        'updating': 'جارٍ التحديث...', 
        'onlineNow': 'متصل الآن', 
        'onlineOnAccountTask': 'متصل الآن على "{account}" - "{task}"', 
        'onlineButNotWorking': 'متصل ولكن لا يعمل', 
        'workingButNoRecord': 'يعمل ولكنه لم يسجل أي مهمة منذ {minutes} دقيقة و {seconds} ثانية', 
        'onlineSince':'كان متصل منذ {minutes} دقيقة و {seconds} ثانية', 
        'lastActivity': 'آخر نشاط: {date} {time}', 
        'loadMoreBtn': 'أعرض أكثر ({count})', 
        'loadAllBtn': 'عرض الكل', 
        'noTimings': 'لا توقيتات محددة', 
        'hoursUnitShort': 'س', 
        'minutesUnitShort': 'د', 
        'secondsUnitShort': 'ث', 
        'netSessionTime': 'صافي وقت الجلسة', 
        'delayAmount': 'مقدار التأخير', 
        'totalSessionTime': 'إجمالي وقت الجلسة',
        // --- [مفاتيح الترجمة الجديدة لفلاتر الشهر] ---
        'selectMonth': 'اختر الشهر:',
        'filterByMonth': 'تصفية حسب الشهر:'
        , 'globalFilterByMonth': 'عرض بيانات الشهر (عام):',
        'accountTypeLabel': 'نوع الحساب:',
        'accountTypeColumn': 'نوع الحساب',
        'acctype1': 'النوع 1',
        'acctype2': 'النوع 2'
        , 'editAccountTitle': 'تعديل الحساب'
        , 'saveChangesBtn': 'حفظ التعديلات'
        , 'cancelBtn': 'إلغاء'
        , 'customPriceInputLabel': 'السعر المخصص ($):'
        , 'defaultPriceLabel': 'السعر الافتراضي:'
        , 'editCustomRateTitle': 'تعديل السعر المخصص'
        , 'paymentDueColumn': 'تاريخ الاستحقاق'
        , 'paymentStatusColumn': 'حالة الدفع'
        , 'paidStatus': 'مدفوع'
        , 'pendingStatus': 'قيد الانتظار'
        , 'markedAsPaid': 'تم وضع علامة مدفوع'
        , 'leaderPayrollTitle': 'لوحة القائد - المدفوعات'
        , 'leaderPayrollHint': 'عرض ملخص المستحقات لكل موظف للشهر المحدد، ووضع علامة "مدفوع".'
        , 'editRecord': 'تعديل'
        , 'taskCountEdit': 'عدد المهام:'
        , 'totalTimeEdit': 'إجمالي الوقت (دقيقة):'
        , 'dateColumn': 'التاريخ:'
        , 'timeColumn': 'الوقت:'
        , 'close': 'إغلاق'
        , 'error': 'خطأ'
        , 'confirmAction': 'تأكيد الإجراء'
        , 'confirmBtn': 'تأكيد'
        , 'loadMoreBtn': 'أعرض أكثر ({count})'
        , 'loadAllBtn': 'عرض الكل'
        , 'leaderPayrollTitle': 'لوحة القائد - المدفوعات',
        'leaderPayrollHint': 'عرض ملخص المستحقات لكل موظف للشهر المحدد، ووضع علامة مدفوع.',
        'paymentDueColumn': 'تاريخ الاستحقاق',
        'paymentStatusColumn': 'حالة الدفع',
        'paidStatus': 'مدفوع',
        'pendingStatus': 'قيد الانتظار',
        'markedAsPaid': 'تم وضع علامة مدفوع'
        // --------------------------------------------
    },
    'en': {
        'loginTitle': 'Login',
        'pinPlaceholder': 'Enter PIN',
        'loginBtn': 'Login',
        'pinError': 'Please enter an 8-digit PIN only.',
        'pinIncorrect': 'Incorrect PIN. Please try again.',
        'loginError': 'An error occurred during login. Please try again later.',
        'admin': 'Admin',
        'leader': 'Leader',
        'totalHoursTitle': 'Total Work Hours:',
        'hoursUnit': 'hours',
        'totalBalanceTitle': 'Total Balance:',
        'currencyUnit': '$',
        // توحيد العملة للدولار الأمريكي
        'currencyUnit': 'USD',
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
        'serialColumn': 'Serial',
        'dateColumn': 'Date',
        'dailyTotalTimeColumn': 'Daily Total Time',
        'timingValueColumn': 'Timing (minutes)',
        'taskTimingsSummary': 'Task Timings Summary',
        'totalForTaskColumn': 'Total for Task',
        'totalForAccountColumn': 'Total for Account',
        'taskColumn': 'Task',
        'totalTimeMinutesColumn': 'Total Time (minutes)',
        'completedTasksColumn': 'Completed Tasks',
        'noDataToShow': 'No data to display',
        'adminPanelTitle': 'Admin Panel',
        'manageUsers': 'Manage Users',
        'newUserName': 'New User Name',
        'newUserPIN': 'User PIN (8 digits)',
        'addUserBtn': 'Add User',
        'currentUsers': 'Current Users:',
        'nameColumn': 'Name',
        'pinColumn': 'PIN',
        'gotoadmindashbourd': 'Admin Dashboard',
        'statusColumn': 'Status', 
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
        'defaultPricePlaceholder': 'Default Price per Hour (USD)', 
        'addAccountBtn': 'Add Account',
        'currentAccounts': 'Current Accounts:',
        'accountNameColumn': 'Account Name',
        'defaultPriceColumn': 'Default Price/Hour', 
        'confirmDeleteAccount': 'Are you sure you want to delete account {name}?',
        'accountDeletedSuccess': 'Account deleted successfully.',
        'enterAccountName': 'Please enter an account name.',
        'accountExists': 'This account name already exists. Please choose another.',
        'accountAddedSuccess': 'Account added successfully!',
        'errorAddingAccount': 'An error occurred while adding the account.',
        'manageTasks': 'Manage Tasks & Timings',
        'newTaskName': 'New Task Name',
        'timingPlaceholder': 'Timing (minutes)',
        'minutesPlaceholder': 'Minutes', 
        'secondsPlaceholder': 'Seconds', 
        'addTimingField': 'Add Timing Field',
        'addTaskBtn': 'Add New Task',
        'currentTasks': 'Current Tasks:',
        'taskNameColumn': 'Task',
        'timingsColumn': 'Timings (minutes:seconds)', 
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
        'timeColumn': 'Time',
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
        'grandTotal': 'Grand Total',
        'totalTasksOverall': 'Total Tasks Overall',
        'totalTimeOverall': 'Total Time Overall',
        'totalBalanceOverall': 'Total Balance Overall',
        'sessionWarning': 'Your session will expire in {duration} or {closedBrowserDuration} after closing the browser. Do you want to log out now?', 
        'manageEmployeeRates': 'Manage Employee Rates & Totals', 
        'employeeNameColumn': 'Employee', 
        'customPriceColumn': 'Custom Price/Hour', 
        'employeeTotalHoursColumn': 'Total Hours', 
        'employeeTotalBalanceColumn': 'Total Balance Due', 
        'paymentsLogTitle': 'Payments Log',
        'monthColumn': 'Month',
        'allStatuses': 'All Statuses',
        'editCustomRateTitle': 'Edit Custom Rate', 
        'editAccountTitle': 'Edit Account',
        'employeeNameLabel': 'Employee:', 
        'accountNameLabel': 'Account:', 
        'defaultPriceLabel': 'Default Price:', 
        'customPriceInputLabel': 'Custom Price (USD):', 
        'rateUpdated': 'Custom rate updated successfully.', 
        'invalidTime': 'Please enter valid values for minutes and seconds.', 
        'invalidPrice': 'Please enter a valid price.', 
        'modify': 'Modify', 
        'notSet': 'Not Set', 
        'unauthorizedAccess': 'Unauthorized access. Please log in as an administrator.', 
        'error': 'Error', 
        'close': 'Close', 
        'accountTotalTimeColumnShort': 'Account Time', 
        'accountBalanceColumn': 'Account Balance', 
        'timeSinceLastClick': 'Last click was {minutes} minutes and {seconds} seconds ago.', 
        'tasksSummaryTooltip': '{count} tasks of {time} minutes', 
        'confirmAction': 'Confirm Action', 
        'cancelBtn': 'Cancel', 
        'allAccounts': 'All Accounts', 
        'allTasks': 'All Tasks', 
        'requiredField': 'This field is required.', 
        'invalidPinLength': 'PIN must be 8 digits.', 
        'invalidNumber': 'Please enter a valid number.', 
        'invalidTimeInput': 'Please enter valid minutes and seconds.', 
        'saving': 'Saving...', 
        'deleting': 'Deleting...', 
        'adding': 'Adding...', 
        'updating': 'Updating...', 
        'onlineNow': 'Online Now', 
        'onlineOnAccountTask': 'Online now on "{account}" - "{task}"', 
        'onlineButNotWorking': 'Online but not working', 
        'onlineSince':'was online since {minutes} minutes and {seconds} seconds ago', 
        'workingButNoRecord': 'Working but hasn\'t recorded any task since {minutes} minutes and {seconds} seconds ago', 
        'lastActivity': 'Last activity: {date} {time}', 
        'loadMoreBtn': 'Show More ({count})', 
        'loadAllBtn': 'Show All', 
        'noTimings': 'No timings defined', 
        'hoursUnitShort': 'h', 
        'minutesUnitShort': 'm', 
        'secondsUnitShort': 's', 
        'netSessionTime': 'Net session time', 
        'delayAmount': 'Delay amount', 
        'totalSessionTime': 'Total session time',
        // --- [New keys for Month Filters] ---
        'selectMonth': 'Select Month:',
        'filterByMonth': 'Filter by Month:'
        , 'globalFilterByMonth': 'Global Month (all views):',
        'accountTypeLabel': 'Account Type:',
        'accountTypeColumn': 'Account Type',
        'acctype1': 'Type 1',
        'acctype2': 'Type 2'
        , 'editAccountTitle': 'Edit Account'
        , 'saveChangesBtn': 'Save Changes'
        , 'cancelBtn': 'Cancel'
        , 'customPriceInputLabel': 'Custom Price (USD):'
        , 'defaultPriceLabel': 'Default Price:'
        , 'editCustomRateTitle': 'Edit Custom Rate'
        , 'paymentDueColumn': 'Payment Due'
        , 'paymentStatusColumn': 'Payment Status'
        , 'paidStatus': 'Paid'
        , 'pendingStatus': 'Pending'
        , 'markedAsPaid': 'Marked as paid'
        , 'leaderPayrollTitle': 'Leader Payroll'
        , 'leaderPayrollHint': 'Show per-employee dues for the selected month and mark as paid.'
        , 'editRecord': 'Edit'
        , 'taskCountEdit': 'Task Count:'
        , 'totalTimeEdit': 'Total Time (minutes):'
        , 'dateColumn': 'Date:'
        , 'timeColumn': 'Time:'
        , 'close': 'Close'
        , 'error': 'Error'
        , 'confirmAction': 'Confirm Action'
        , 'confirmBtn': 'Confirm'
        , 'loadMoreBtn': 'Show More ({count})'
        , 'loadAllBtn': 'Show All'
        , 'leaderPayrollTitle': 'Leader Payroll',
        'leaderPayrollHint': 'Show per-employee dues for the selected month and mark as paid.',
        'paymentDueColumn': 'Payment Due',
        'paymentStatusColumn': 'Payment Status',
        'paidStatus': 'Paid',
        'pendingStatus': 'Pending',
        'markedAsPaid': 'Marked as paid'
        // ------------------------------------
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
        const isDarkMode = document.body.classList.contains('dark-mode');
        taskChart.options.plugins.legend.labels.color = isDarkMode ? '#BDC3C7' : '#333'; 
        taskChart.options.plugins.title.color = isDarkMode ? '#76D7C4' : '#2c3e50'; 
        taskChart.update();
    }
    
    pinInputs.forEach(input => {
        input.style.direction = 'ltr'; 
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
    // Translate elements with data-key attribute
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.getAttribute('data-key');
        if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
            element.placeholder = getTranslatedText(key);
        } else if (key === 'hello') {
            element.childNodes[0].nodeValue = getTranslatedText(key);
        } else if (['taskCount', 'totalTimeRecorded', 'totalHoursTitle', 'totalBalanceTitle', 'employeeNameLabel', 'accountNameLabel', 'defaultPriceLabel', 'customPriceInputLabel', 'selectMonth', 'filterByMonth'].includes(key)) {
            // إضافة المفاتيح الجديدة الخاصة بالفلاتر هنا
            const spanElement = element.querySelector('span');
            if (spanElement) {
                spanElement.textContent = getTranslatedText(key);
            } else {
                element.textContent = getTranslatedText(key);
            }
        } else if (key === 'sessionWarning') {
            const durationHours = SESSION_DURATION_MS / (60 * 60 * 1000);
            const closedBrowserDurationHours = SESSION_CLOSED_BROWSER_MS / (60 * 60 * 1000);
            element.textContent = getTranslatedText(key, { duration: `${durationHours} ${getTranslatedText('hoursUnit')}`, closedBrowserDuration: `${closedBrowserDurationHours} ${getTranslatedText('hoursUnit')}` });
        } else if (key === 'loadMoreBtn') {
            element.textContent = getTranslatedText(key, { count: RECORDS_PER_PAGE });
        }
        else {
            element.textContent = getTranslatedText(key);
        }
    });

    // Update dynamic timing inputs placeholders
    const newTimingMinutesInputs = newTimingsContainer.querySelectorAll('.new-task-timing-minutes');
    newTimingMinutesInputs.forEach(input => { input.placeholder = getTranslatedText('minutesPlaceholder'); });
    const newTimingSecondsInputs = newTimingsContainer.querySelectorAll('.new-task-timing-seconds');
    newTimingSecondsInputs.forEach(input => { input.placeholder = getTranslatedText('secondsPlaceholder'); });

    document.querySelectorAll('.undo-btn').forEach(btn => {
        btn.textContent = getTranslatedText('undoLastAdd');
    });

    document.getElementById('confirmModalBtn').textContent = getTranslatedText('confirmBtn');
    document.getElementById('cancelModalBtn').textContent = getTranslatedText('cancelBtn');

    // Re-render components if visible
    if (startWorkPage.style.display === 'flex' && taskSelectionPopup.style.display === 'none') {
        renderTaskTimingButtons(); 
        updateWorkSummary(); 
    }
    if (adminPanelPage.style.display === 'flex') {
        loadAndDisplayUsers(); 
    }
    if (trackWorkPage.style.display === 'flex') {
        renderTrackWorkPage();
    }
};

const formatNumberToEnglish = (num) => {
    return num.toLocaleString('en-US', { useGrouping: false });
};

// 4. Session Management Functions
const saveSession = async (user) => {
    const sessionExpiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    localStorage.setItem('sessionExpiry', sessionExpiry.toString());

    if (user && user.id !== 'admin') {
        try {
            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, {
                lastActivityTimestamp: serverTimestamp(),
                currentAccountId: null,
                currentAccountName: null,
                currentTaskDefinitionId: null,
                currentTaskDefinitionName: null,
                lastRecordedTaskTimestamp: null,
                sessionStartTime: null 
            });
        } catch (error) {
            console.error("Error updating user activity on session save:", error);
        }
    }
};

const clearSession = async () => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        try {
            const userDocRef = doc(db, 'users', loggedInUser.id);
            await updateDoc(userDocRef, {
                lastActivityTimestamp: serverTimestamp(),
                currentAccountId: null,
                currentAccountName: null,
                currentTaskDefinitionId: null,
                currentTaskDefinitionName: null,
                lastRecordedTaskTimestamp: null,
                sessionStartTime: null 
            });
        } catch (error) {
            console.error("Error clearing user activity on logout:", error);
        }
    }
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionExpiry');
    loggedInUser = null; 
};

const loadSession = async () => {
    const storedUser = localStorage.getItem('loggedInUser');
    const storedExpiry = localStorage.getItem('sessionExpiry');

    if (storedUser && storedExpiry && Date.now() < parseInt(storedExpiry)) {
        loggedInUser = JSON.parse(storedUser);
        // تهيئة فلاتر الشهر عند استعادة الجلسة
        initMonthFilters();
        await fetchAllStaticData();
        if (loggedInUser.id === 'admin') {
            showPage(adminPanelPage); 
            await renderAdminPanel(); 
        } else {
            showPage(mainDashboard); 
            await renderMainDashboard();
            trackUserActivity(); 
            try {
                const userDocRef = doc(db, 'users', loggedInUser.id);
                await updateDoc(userDocRef, { lastActivityTimestamp: serverTimestamp() });
            } catch (error) {
                console.error("Error updating last activity timestamp on session load:", error);
            }
        }
        return true; 
    } else {
        clearSession(); 
        return false; 
    }
};

window.addEventListener('beforeunload', (event) => {
    if (currentSessionTasks.length > 0 && !isSavingWork && loggedInUser && loggedInUser.id !== 'admin') {
        event.preventDefault();
        event.returnValue = ''; 
        return ''; 
    }
    if (loggedInUser) {
        event.preventDefault();
        event.returnValue = getTranslatedText('sessionWarning', {
            duration: `${SESSION_DURATION_MS / (60 * 60 * 1000)} ${getTranslatedText('hoursUnit')}`,
            closedBrowserDuration: `${SESSION_CLOSED_BROWSER_MS / (60 * 60 * 1000)} ${getTranslatedText('hoursUnit')}` 
        });
        return event.returnValue;
    }
});

const fetchAllStaticData = async () => {
    showLoadingIndicator(true);
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        allUsers = usersSnapshot.docs.map(getDocData);

        const accountsSnapshot = await getDocs(collection(db, 'accounts'));
        allAccounts = accountsSnapshot.docs.map(getDocData);

        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        allTaskDefinitions = tasksSnapshot.docs.map(getDocData);

    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const showLoginErrorModal = (message) => {
    loginErrorModalTitle.textContent = getTranslatedText('error');
    loginErrorModalMessage.textContent = message;
    loginErrorModal.style.display = 'flex'; 
};

// 5. Login Logic (Updated for 8 PIN fields and custom error modal)
const handleLogin = async () => {
    const fullPin = pinInputs.map(input => input.value).join('');
    loginErrorModal.style.display = 'none'; 

    pinInputs.forEach(input => {
        input.classList.remove('is-invalid');
    });

    if (fullPin.length !== 8 || !/^\d+$/.test(fullPin)) {
        showLoginErrorModal(getTranslatedText('pinError'));
        pinInputs.forEach(input => input.classList.add('is-invalid')); 
        return;
    }

    showLoadingIndicator(true);
    try {
        // Load admin and leader PINs from settings (with defaults)
        const adminDocRef = doc(db, 'settings', 'adminPin');
        const leaderDocRef = doc(db, 'settings', 'leaderPin');
        let adminPinValue = "87654321"; // default admin PIN (avoid clashing with leader)
        let leaderPinValue = "12345678"; // default leader PIN as requested

        try {
            const adminDocSnapshot = await getDoc(adminDocRef);
            if (adminDocSnapshot && adminDocSnapshot.exists()) {
                adminPinValue = adminDocSnapshot.data().pin || adminPinValue;
            } else {
                await setDoc(adminDocRef, { pin: adminPinValue });
            }
        } catch (error) {
            console.error("Admin PIN fetch failed, using default.");
        }
        try {
            const leaderDocSnapshot = await getDoc(leaderDocRef);
            if (leaderDocSnapshot && leaderDocSnapshot.exists()) {
                leaderPinValue = leaderDocSnapshot.data().pin || leaderPinValue;
            } else {
                await setDoc(leaderDocRef, { pin: leaderPinValue });
            }
        } catch (error) {
            console.error("Leader PIN fetch failed, using default.");
        }

        // جلب البيانات الأساسية قبل التحقق
        await fetchAllStaticData();

        if (fullPin === adminPinValue) {
            loggedInUser = { id: 'admin', name: getTranslatedText('admin'), role: 'admin' };
            await saveSession(loggedInUser);
            showPage(adminPanelPage);
            await renderAdminPanel();
            pinInputs.forEach(input => input.value = '');
            return;
        }
        if (fullPin === leaderPinValue) {
            loggedInUser = { id: 'leader', name: getTranslatedText('leader'), role: 'leader' };
            await saveSession(loggedInUser);
            showPage(adminPanelPage);
            await renderAdminPanel();
            pinInputs.forEach(input => input.value = '');
            return;
        }

        const usersCollectionRef = collection(db, 'users');
        const userQueryRef = query(usersCollectionRef, where('pin', '==', fullPin), limit(1));
        const userQuerySnapshot = await getDocs(userQueryRef);
        
        if (!userQuerySnapshot.empty) {
            loggedInUser = getDocData(userQuerySnapshot.docs[0]);
            if (!loggedInUser.role) {
                loggedInUser.role = 'user';
            }
            
            // تهيئة فلاتر الشهور قبل الدخول للوحة التحكم
            initMonthFilters(); 
            
            await saveSession(loggedInUser); 
            trackUserActivity(); 
            showPage(mainDashboard);
            await renderMainDashboard(); 
            pinInputs.forEach(input => input.value = ''); 
            return;
        }

        showLoginErrorModal(getTranslatedText('pinIncorrect'));
        pinInputs.forEach(input => input.classList.add('is-invalid')); 

    } catch (error) {
        if (error.code === 'unavailable' || error.code === 'permission-denied') {
            showLoginErrorModal(getTranslatedText('noInternet') + ' أو مشكلة في الصلاحيات.');
        } else {
            showLoginErrorModal(getTranslatedText('loginError'));
        }
    } finally {
        showLoadingIndicator(false);
    }
};

const logout = async () => {
    await clearSession(); 
    showPage(loginPage);
    pinInputs.forEach(input => input.value = ''); 
    pinInputs[0].focus(); 
};

// User Activity Tracking

// --- [اختبار داخلي سريع لمنطق المصادقة - يُزال بعد التأكد] ---
async function __testAuthLogic() {
    // محاكاة إدخال PIN القائد
    const leaderPin = "12345678";
    const adminPin = "87654321";
    const fakePin = "11111111";
    let result = [];
    // دالة مساعدة لمحاكاة الإدخال
    async function tryLogin(pin) {
        let fullPin = pin;
        let testUser = null;
        // محاكاة منطق المصادقة كما في handleLogin
        const adminDocRef = doc(db, 'settings', 'adminPin');
        const leaderDocRef = doc(db, 'settings', 'leaderPin');
        let adminPinValue = "87654321";
        let leaderPinValue = "12345678";
        try {
            const adminDocSnapshot = await getDoc(adminDocRef);
            if (adminDocSnapshot && adminDocSnapshot.exists()) {
                adminPinValue = adminDocSnapshot.data().pin || adminPinValue;
            }
        } catch {}
        try {
            const leaderDocSnapshot = await getDoc(leaderDocRef);
            if (leaderDocSnapshot && leaderDocSnapshot.exists()) {
                leaderPinValue = leaderDocSnapshot.data().pin || leaderPinValue;
            }
        } catch {}
        if (fullPin === adminPinValue) {
            testUser = { id: 'admin', name: getTranslatedText('admin'), role: 'admin' };
            result.push({ pin, role: testUser.role, page: 'adminPanelPage' });
            return;
        }
        if (fullPin === leaderPinValue) {
            testUser = { id: 'leader', name: getTranslatedText('leader'), role: 'leader' };
            result.push({ pin, role: testUser.role, page: 'adminPanelPage' });
            return;
        }
        result.push({ pin, role: 'none', page: 'loginError' });
    }
    await tryLogin(leaderPin);
    await tryLogin(adminPin);
    await tryLogin(fakePin);
    // عرض النتائج في الكونسول
    console.log('نتائج اختبار المصادقة:', result);
    // مثال: تحقق آلي
    if (
        result[0].role === 'leader' && result[0].page === 'adminPanelPage' &&
        result[1].role === 'admin' && result[1].page === 'adminPanelPage' &&
        result[2].role === 'none' && result[2].page === 'loginError'
    ) {
        console.log('✅ منطق المصادقة يعمل كما هو متوقع (قائد/إدارة)');
    } else {
        console.error('❌ مشكلة في منطق المصادقة!');
    }
}
// لتشغيل الاختبار: أزل التعليق عن السطر التالي مؤقتاً
// __testAuthLogic();
let activityInterval = null;

const updateLastActivityTimestamp = async (clearCurrentActivity = false) => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        try {
            const userDocRef = doc(db, 'users', loggedInUser.id);
            const updateData = { lastActivityTimestamp: serverTimestamp() };

            if (clearCurrentActivity) {
                updateData.currentAccountId = null;
                updateData.currentAccountName = null;
                updateData.currentTaskDefinitionId = null;
                updateData.currentTaskDefinitionName = null;
                updateData.lastRecordedTaskTimestamp = null;
                updateData.sessionStartTime = null; 
            }
            await updateDoc(userDocRef, updateData);
        } catch (error) {
            // Background op, fail silently
        }
    }
};

const trackUserActivity = () => {
    if (activityInterval) clearInterval(activityInterval);
    updateLastActivityTimestamp();
    activityInterval = setInterval(updateLastActivityTimestamp, 30 * 1000); 

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') updateLastActivityTimestamp();
    });

    document.addEventListener('mousemove', updateLastActivityTimestamp, { passive: true, once: true });
    document.addEventListener('keypress', updateLastActivityTimestamp, { passive: true, once: true });
};

// 6. Main Dashboard Logic
const renderMainDashboard = async () => {
    if (!loggedInUser || loggedInUser.role === 'admin') {
        showPage(adminPanelPage);
        return;
    }
    userNameDisplay.textContent = loggedInUser.name; 
    showLoadingIndicator(true);
    
    try {
        const userId = loggedInUser.id;
        const workRecordsCollectionRef = collection(db, 'workRecords');
        // Use selected month (default to current month if element missing)
        const selectedMonth = (globalMonthFilter && globalMonthFilter.value) ? globalMonthFilter.value : getCurrentMonthValue();

        // Load and cache all user's workRecords once to allow instant client-side month filtering
        if (!userWorkRecordsCache.has(userId)) {
            try {
                const userRecordsQuery = query(workRecordsCollectionRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));
                const recordsSnapshot = await getDocs(userRecordsQuery);
                const docs = recordsSnapshot.docs.map(getDocData);
                userWorkRecordsCache.set(userId, docs);
            } catch (err) {
                // fallback: ensure cache has an array
                userWorkRecordsCache.set(userId, []);
            }
        }

        const allUserRecords = userWorkRecordsCache.get(userId) || [];
        let filteredRecords = filterRecordsByMonth(allUserRecords, selectedMonth);
        // لا تقم بتغيير الشهر تلقائياً إذا لم توجد بيانات، فقط أظهر "لا توجد بيانات"

        // Compute totals from filteredRecords
        let totalMinutesWorked = 0;
        let totalBalance = 0;

        const accountsMap = new Map(allAccounts.map(acc => [acc.id, acc]));

        // Load user's custom rates (still fetched from Firestore)
        const userCustomRatesCol = collection(db, 'userAccountRates');
        const userRatesQuery = query(userCustomRatesCol, where('userId', '==', userId));
        const userRatesSnapshot = await getDocs(userRatesQuery);
        const userCustomRatesMap = new Map(); 
        userRatesSnapshot.forEach(docSnap => {
            const rate = getDocData(docSnap);
            userCustomRatesMap.set(rate.accountId, rate.customPricePerHour);
        });

        filteredRecords.forEach(record => {
            totalMinutesWorked += (record.totalTime || 0);
            const account = accountsMap.get(record.accountId);
            if (account) {
                let pricePerHour = account.defaultPricePerHour || 0; 
                if (userCustomRatesMap.has(record.accountId)) {
                    pricePerHour = userCustomRatesMap.get(record.accountId);
                }
                totalBalance += ((record.totalTime || 0) / 60) * pricePerHour;
            }
        });

        totalHoursDisplay.textContent = formatNumberToEnglish(formatTotalMinutesToHHMMSS(totalMinutesWorked));

        // حساب الرصيد المدفوع والمستحق لهذا الشهر
        // جلب مدفوعات هذا المستخدم لهذا الشهر
        const paymentsCol = collection(db, 'payments');
        const paymentsQuery = query(paymentsCol, where('userId', 'in', [userId, userId+'_1', userId+'_2']), where('month', '==', selectedMonth));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        let paidAmount = 0;
        paymentsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            paidAmount += Number(data.amount || 0);
        });
        const unpaidAmount = totalBalance - paidAmount;
        // بناء العناصر الملونة
        const balanceBox = totalBalanceDisplay.parentElement;
        totalBalanceDisplay.innerHTML = '';
        if (paidAmount > 0 && unpaidAmount > 0) {
            // جزء مدفوع وجزء مستحق
            totalBalanceDisplay.innerHTML = `إجمالي الرصيد: = <span style="font-weight:bold">${formatNumberToEnglish(totalBalance.toFixed(2))} $</span> : ( <span style="color:green;font-weight:bold">${formatNumberToEnglish(paidAmount.toFixed(2))} $ مدفوع</span> + <span style="color:red;font-weight:bold">${formatNumberToEnglish(unpaidAmount.toFixed(2))} $ مستحق</span> )`;
        } else if (paidAmount > 0 && unpaidAmount <= 0.01) {
            // الكل مدفوع
            totalBalanceDisplay.innerHTML = `<span style="color:green;font-weight:bold">${formatNumberToEnglish(totalBalance.toFixed(2))} $ مدفوع</span>`;
        } else {
            // الكل مستحق
            totalBalanceDisplay.innerHTML = `<span style="color:red;font-weight:bold">${formatNumberToEnglish(totalBalance.toFixed(2))} $ مستحق</span>`;
        }

    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const handleStartWorkOptionClick = async () => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        showPage(startWorkPage);
        await initializeStartWorkPage();
        updateSaveButtonState(); 
    }
};

const handleTrackWorkOptionClick = async () => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        showPage(trackWorkPage);
        await renderTrackWorkPage(); 
        await updateLastActivityTimestamp(true);
    }
};

// 7. Start Work Page Logic
const fetchAccountsAndTasks = async () => {
    try {
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
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

const initializeStartWorkPage = async () => {
    currentSessionTasks = [];
    completedTasksCount.textContent = formatNumberToEnglish(0);
    recordedTotalTime.textContent = formatNumberToEnglish('00:00:00'); 
    detailedSummaryContainer.innerHTML = ''; 
    taskTimingButtonsContainer.innerHTML = '';
    selectedAccount = null;
    selectedTaskDefinition = null;
    taskDetailsContainer.style.display = 'none'; 
    taskSelectionPopup.style.display = 'flex'; 
    accountSelect.value = "";
    taskTypeSelect.value = "";
    lastClickTime = null; 
    await fetchAccountsAndTasks(); 
    await updateLastActivityTimestamp(true);
};

const handleConfirmSelection = async () => {
    const accountId = accountSelect.value;
    const taskDefinitionId = taskTypeSelect.value;

    if (!accountId || !taskDefinitionId) {
        showToastMessage(getTranslatedText('selectAccountTask'), 'error');
        return;
    }

    selectedAccount = allAccounts.find(acc => acc.id === accountId);
    selectedTaskDefinition = allTaskDefinitions.find(task => task.id === taskDefinitionId);

    if (selectedAccount && selectedTaskDefinition) {
        taskSelectionPopup.style.display = 'none';
        taskDetailsContainer.style.display = 'block'; 
        renderTaskTimingButtons();
        updateWorkSummary(); 

        if (loggedInUser && loggedInUser.id !== 'admin') {
            try {
                const userDocRef = doc(db, 'users', loggedInUser.id);
                await updateDoc(userDocRef, {
                    currentAccountId: selectedAccount.id,
                    currentAccountName: selectedAccount.name,
                    currentTaskDefinitionId: selectedTaskDefinition.id,
                    currentTaskDefinitionName: selectedTaskDefinition.name,
                    lastRecordedTaskTimestamp: serverTimestamp(), 
                    sessionStartTime: serverTimestamp() 
                });
            } catch (error) {
                console.error("Error updating activity:", error);
            }
        }
    }
};

backToDashboardFromPopup.addEventListener('click', () => {
    if (currentSessionTasks.length > 0) {
        showConfirmationModal(getTranslatedText('unsavedTasksWarning'), async () => {
            currentSessionTasks = []; 
            await updateLastActivityTimestamp(true); 
            showPage(mainDashboard);
        });
    } else {
        showPage(mainDashboard);
    }
});

const renderTaskTimingButtons = () => {
    taskTimingButtonsContainer.innerHTML = '';
    if (selectedTaskDefinition && selectedTaskDefinition.timings && selectedTaskDefinition.timings.length > 0) {
        selectedTaskDefinition.timings.forEach((timingValue) => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('timing-button-wrapper');
            wrapper.style.position = 'relative';

            const button = document.createElement('button');
            button.classList.add('task-timing-btn');
            button.textContent = formatNumberToEnglish(formatMinutesToMMSS(timingValue)); 
            button.dataset.timing = timingValue;

            const timeMessageDiv = document.createElement('div');
            timeMessageDiv.classList.add('time-since-last-click');
            timeMessageDiv.style.display = 'none'; 
            wrapper.appendChild(timeMessageDiv);

            button.addEventListener('click', async () => {
                const now = Date.now();
                if (lastClickTime) {
                    const diffSeconds = Math.floor((now - lastClickTime) / 1000);
                    const minutes = Math.floor(diffSeconds / 60);
                    const seconds = diffSeconds % 60;
                    timeMessageDiv.textContent = getTranslatedText('timeSinceLastClick', {
                        minutes: formatNumberToEnglish(minutes),
                        seconds: formatNumberToEnglish(seconds)
                    });
                    timeMessageDiv.style.display = 'block';
                    timeMessageDiv.classList.add('show');
                    setTimeout(() => {
                        timeMessageDiv.classList.remove('show');
                        setTimeout(() => timeMessageDiv.style.display = 'none', 300);
                    }, 3000);
                }
                lastClickTime = now; 

                currentSessionTasks.push({
                    accountId: selectedAccount.id,
                    accountName: selectedAccount.name,
                    taskId: selectedTaskDefinition.id,
                    taskName: selectedTaskDefinition.name,
                    timing: parseFloat(timingValue),
                    timestamp: Date.now() 
                });
                updateWorkSummary();
                wrapper.querySelector('.undo-btn').classList.add('show');

                if (loggedInUser && loggedInUser.id !== 'admin') {
                    try {
                        const userDocRef = doc(db, 'users', loggedInUser.id);
                        await updateDoc(userDocRef, { lastRecordedTaskTimestamp: serverTimestamp() });
                    } catch (error) {}
                }
            });
            wrapper.appendChild(button);

            const undoButton = document.createElement('button');
            undoButton.classList.add('undo-btn');
            undoButton.textContent = getTranslatedText('undoLastAdd');
            undoButton.addEventListener('click', () => {
                const indexToRemove = currentSessionTasks.map(t => t.timing).lastIndexOf(parseFloat(timingValue));
                if (indexToRemove > -1) {
                    currentSessionTasks.splice(indexToRemove, 1);
                    updateWorkSummary();
                }
                const countOfThisTiming = currentSessionTasks.filter(t => t.timing === parseFloat(timingValue)).length;
                if (countOfThisTiming === 0) undoButton.classList.remove('show');
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
    const timingSummary = {};

    currentSessionTasks.forEach(task => {
        const timingKey = Math.round(task.timing * 1000).toString();
        if (!timingSummary[timingKey]) {
            timingSummary[timingKey] = { count: 0, totalTime: 0 };
        }
        timingSummary[timingKey].count++;
        timingSummary[timingKey].totalTime += task.timing;
        totalCount++;
        totalTime += task.timing;
    });

    completedTasksCount.textContent = formatNumberToEnglish(totalCount);
    recordedTotalTime.textContent = formatNumberToEnglish(formatMinutesToMMSS(totalTime)); 

    detailedSummaryContainer.innerHTML = ''; 

    if (Object.keys(timingSummary).length > 0) {
        const heading = document.createElement('h3');
        heading.textContent = getTranslatedText('taskDetailsByTiming');
        detailedSummaryContainer.appendChild(heading);

        const sortedTimings = Object.keys(timingSummary).sort((a, b) => parseFloat(a) - parseFloat(b));

        sortedTimings.forEach(timingKey => {
            const summary = timingSummary[timingKey];
            const p = document.createElement('p');
            const displayTimingMinutes = parseFloat(timingKey) / 1000;
            p.textContent = getTranslatedText('tasksTiming', {
                timing: formatNumberToEnglish(formatMinutesToMMSS(displayTimingMinutes)),
                count: formatNumberToEnglish(summary.count),
                totalTime: formatNumberToEnglish(formatMinutesToMMSS(summary.totalTime))
            });
            detailedSummaryContainer.appendChild(p);
        });
    }
    updateSaveButtonState(); 
};

// 8. Save Work Logic
const updateSaveButtonState = () => {
    saveWorkBtn.disabled = currentSessionTasks.length === 0;
    if (currentSessionTasks.length === 0) {
        saveWorkBtn.classList.add('disabled');
    } else {
        saveWorkBtn.classList.remove('disabled');
    }
};

const saveWorkRecord = async () => {
    if (currentSessionTasks.length === 0) {
        showToastMessage(getTranslatedText('noTasksToSave'), 'error');
        return;
    }

    showConfirmationModal(getTranslatedText('confirmSave'), async () => {
        isSavingWork = true; 
        showLoadingIndicator(true);
        saveWorkBtn.disabled = true;
        saveWorkBtn.textContent = getTranslatedText('saving');

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
                totalTasksCount: currentSessionTasks.length,
                totalTime: currentSessionTasks.reduce((sum, task) => sum + task.timing, 0),
                timestamp: serverTimestamp() 
            };

            await addDoc(collection(db, 'workRecords'), recordData);
            showToastMessage(getTranslatedText('workSavedSuccess'), 'success');
            currentSessionTasks = [];
            // Invalidate caches so UI reflects newly added record
            userWorkRecordsCache.delete(loggedInUser.id);
            allWorkRecordsCache = null;
            isSavingWork = false;

            await updateLastActivityTimestamp(true);
            showPage(mainDashboard);
            await renderMainDashboard();
        }
        catch (error) {
            showToastMessage(getTranslatedText('errorSavingWork'), 'error');
        } finally {
            showLoadingIndicator(false);
            saveWorkBtn.disabled = false;
            saveWorkBtn.textContent = getTranslatedText('saveWorkBtn');
        }
    });
};

backToDashboardFromStartWork.addEventListener('click', () => {
    if (currentSessionTasks.length > 0) {
        showConfirmationModal(getTranslatedText('unsavedTasksWarning'), async () => {
            currentSessionTasks = []; 
            await updateLastActivityTimestamp(true); 
            showPage(mainDashboard);
        });
    } else {
        updateLastActivityTimestamp(true);
        showPage(mainDashboard);
    }
});

// 9. Track Work Page Logic (With Grouping & Chart)
const renderTrackWorkPage = async () => {
    if (!loggedInUser || loggedInUser.id === 'admin') {
        showPage(loginPage);
        return;
    }
    trackTasksTableBody.innerHTML = '';
    trackTasksTableFoot.innerHTML = ''; 
    showLoadingIndicator(true);

    try {
        const userId = loggedInUser.id;
        // Use selected month from track page filter, default to current month
        const selectedMonth = (globalMonthFilter && globalMonthFilter.value) ? globalMonthFilter.value : getCurrentMonthValue();

        // Ensure user's work records are cached
        if (!userWorkRecordsCache.has(userId)) {
            try {
                const userRecordsQuery = query(collection(db, 'workRecords'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
                const snap = await getDocs(userRecordsQuery);
                const docs = snap.docs.map(getDocData);
                userWorkRecordsCache.set(userId, docs);
            } catch (err) {
                userWorkRecordsCache.set(userId, []);
            }
        }

        const allUserRecords = userWorkRecordsCache.get(userId) || [];
        let recordsArray = filterRecordsByMonth(allUserRecords, selectedMonth);
        // لا تقم بتغيير الشهر تلقائياً إذا لم توجد بيانات، فقط أظهر "لا توجد بيانات"

        if (recordsArray.length === 0) {
            const row = trackTasksTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 10;
            cell.textContent = getTranslatedText('noDataToShow');
            cell.style.textAlign = 'center';
            if (taskChart) { taskChart.destroy(); taskChart = null; }
            return;
        }

        const processedData = {};
        let grandTotalTasks = 0;
        let grandTotalTime = 0;
        let chartDataForUser = {};

        const accountsMap = new Map(allAccounts.map(acc => [acc.id, acc]));

        const userAccountRatesCol = collection(db, 'userAccountRates');
        const userRatesQuery = query(userAccountRatesCol, where('userId', '==', userId));
        const userRatesSnapshot = await getDocs(userRatesQuery);
        const userCustomRatesMap = new Map();
        userRatesSnapshot.forEach(docSnap => {
            const rate = getDocData(docSnap);
            userCustomRatesMap.set(rate.accountId, rate.customPricePerHour);
        });

        recordsArray.forEach(record => {
            const recordDateObj = record.timestamp ? new Date(record.timestamp.toDate()) : new Date();
            const recordDate = recordDateObj.toLocaleDateString('en-CA');

            if (!processedData[recordDate]) {
                processedData[recordDate] = { accounts: {}, dateTotalTasks: 0, dateTotalTime: 0, dateTotalBalance: 0, totalRows: 0 };
            }
            if (!processedData[recordDate].accounts[record.accountId]) {
                processedData[recordDate].accounts[record.accountId] = { name: record.accountName, tasks: {}, accountTotalTasks: 0, accountTotalTime: 0, accountTotalBalance: 0, totalRows: 0 };
            }

            const taskKey = record.taskDefinitionId;
            if (!processedData[recordDate].accounts[record.accountId].tasks[taskKey]) {
                processedData[recordDate].accounts[record.accountId].tasks[taskKey] = {
                    name: record.taskDefinitionName,
                    timings: {},
                    taskGroupTotalTasks: 0,
                    taskGroupTotalTime: 0,
                    taskGroupTotalBalance: 0
                };
            }

            record.recordedTimings.forEach(rt => {
                const tKey = Math.round(rt.timing * 1000).toString();
                if (!processedData[recordDate].accounts[record.accountId].tasks[taskKey].timings[tKey]) {
                    processedData[recordDate].accounts[record.accountId].tasks[taskKey].timings[tKey] = { count: 0, totalTime: 0 };
                }
                processedData[recordDate].accounts[record.accountId].tasks[taskKey].timings[tKey].count++;
                processedData[recordDate].accounts[record.accountId].tasks[taskKey].timings[tKey].totalTime += rt.timing;
                chartDataForUser[record.taskDefinitionName] = (chartDataForUser[record.taskDefinitionName] || 0) + rt.timing;
            });

            const account = accountsMap.get(record.accountId);
            let pricePerHour = account ? (account.defaultPricePerHour || 0) : 0;
            if (userCustomRatesMap.has(record.accountId)) pricePerHour = userCustomRatesMap.get(record.accountId);
            
            const recordBalance = (record.totalTime / 60) * pricePerHour;

            processedData[recordDate].accounts[record.accountId].tasks[taskKey].taskGroupTotalTasks += record.totalTasksCount;
            processedData[recordDate].accounts[record.accountId].tasks[taskKey].taskGroupTotalTime += record.totalTime;
            processedData[recordDate].accounts[record.accountId].tasks[taskKey].taskGroupTotalBalance += recordBalance;

            processedData[recordDate].accounts[record.accountId].accountTotalTasks += record.totalTasksCount;
            processedData[recordDate].accounts[record.accountId].accountTotalTime += record.totalTime;
            processedData[recordDate].accounts[record.accountId].accountTotalBalance += recordBalance;

            processedData[recordDate].dateTotalTasks += record.totalTasksCount;
            processedData[recordDate].dateTotalTime += record.totalTime;
            processedData[recordDate].dateTotalBalance += recordBalance;

            grandTotalTasks += record.totalTasksCount;
            grandTotalTime += record.totalTime;
        });

        // Calculate Rowspans
        for (const dKey in processedData) {
            processedData[dKey].totalRows = 0;
            for (const aId in processedData[dKey].accounts) {
                processedData[dKey].accounts[aId].totalRows = 0;
                for (const tKey in processedData[dKey].accounts[aId].tasks) {
                    const timingsCount = Object.keys(processedData[dKey].accounts[aId].tasks[tKey].timings).length;
                    const rows = timingsCount > 0 ? timingsCount : 1;
                    processedData[dKey].accounts[aId].tasks[tKey].totalRows = rows;
                    processedData[dKey].accounts[aId].totalRows += rows;
                }
                processedData[dKey].totalRows += processedData[dKey].accounts[aId].totalRows;
            }
        }

        // Render Chart
        if (taskChart) taskChart.destroy();
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        taskChart = new Chart(taskChartCanvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(chartDataForUser),
                datasets: [{
                    data: Object.values(chartDataForUser),
                    backgroundColor: ['#3498DB', '#2ECC71', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: isDarkMode ? '#BDC3C7' : '#333' }, rtl: currentLanguage === 'ar' },
                    title: { display: true, text: getTranslatedText('totalTimeRecorded'), color: isDarkMode ? '#76D7C4' : '#2c3e50' }
                }
            }
        });

        // Render Table Rows
        let serial = 1;
        const sortedDates = Object.keys(processedData).sort((a, b) => new Date(b) - new Date(a));

        for (const dKey of sortedDates) {
            const dateData = processedData[dKey];
            let dateHandled = false;

            for (const aId in dateData.accounts) {
                const accData = dateData.accounts[aId];
                let accHandled = false;

                for (const tKey in accData.tasks) {
                    const taskData = accData.tasks[tKey];
                    const sortedTimings = Object.keys(taskData.timings).sort((a, b) => parseFloat(a) - parseFloat(b));
                    let taskHandled = false;

                    for (let i = 0; i < taskData.totalRows; i++) {
                        const row = trackTasksTableBody.insertRow();
                        row.classList.add('daily-record-row');

                        if (!accHandled) {
                            const c1 = row.insertCell(); c1.textContent = formatNumberToEnglish(serial++); c1.rowSpan = accData.totalRows; c1.classList.add('total-cell');
                        }
                        if (!dateHandled) {
                            const c2 = row.insertCell(); c2.textContent = new Date(dKey).toLocaleDateString(currentLanguage, { day: 'numeric', month: 'short' }); c2.rowSpan = dateData.totalRows; c2.classList.add('total-cell', 'date-cell');
                        }
                        if (!accHandled) {
                            const c3 = row.insertCell(); c3.textContent = accData.name; c3.rowSpan = accData.totalRows; c3.classList.add('total-cell');
                        }
                        if (!taskHandled) {
                            const c4 = row.insertCell(); c4.textContent = taskData.name; c4.rowSpan = taskData.totalRows;
                        }

                        const tValCell = row.insertCell();
                        const compCell = row.insertCell();
                        const timeCell = row.insertCell();
                        
                        const tK = sortedTimings[i];
                        if (tK) {
                            const tSum = taskData.timings[tK];
                            tValCell.textContent = formatNumberToEnglish(formatMinutesToMMSS(parseFloat(tK)/1000));
                            compCell.textContent = formatNumberToEnglish(tSum.count);
                            timeCell.textContent = formatNumberToEnglish(formatMinutesToMMSS(tSum.totalTime));
                        }

                        if (!taskHandled) {
                            const c8 = row.insertCell(); c8.textContent = `${formatNumberToEnglish(formatMinutesToMMSS(taskData.taskGroupTotalTime))} (${formatNumberToEnglish(taskData.taskGroupTotalBalance.toFixed(2))} ${getTranslatedText('currencyUnit')})`; c8.rowSpan = taskData.totalRows; c8.classList.add('total-cell');
                        }
                        if (!accHandled) {
                            const c9 = row.insertCell(); c9.textContent = `${formatNumberToEnglish(formatMinutesToMMSS(accData.accountTotalTime))} (${formatNumberToEnglish(accData.accountTotalBalance.toFixed(2))} ${getTranslatedText('currencyUnit')})`; c9.rowSpan = accData.totalRows; c9.classList.add('total-cell');
                        }
                        if (!dateHandled) {
                            const c10 = row.insertCell(); c10.textContent = `${formatNumberToEnglish(formatMinutesToMMSS(dateData.dateTotalTime))} (${formatNumberToEnglish(dateData.dateTotalBalance.toFixed(2))} ${getTranslatedText('currencyUnit')})`; c10.rowSpan = dateData.totalRows; c10.classList.add('total-cell', 'daily-total-cell');
                        }

                        dateHandled = accHandled = taskHandled = true;
                    }
                }
            }
        }

        // Footer Grand Totals
        const fRow = trackTasksTableFoot.insertRow();
        const f1 = fRow.insertCell(); f1.colSpan = 5; f1.textContent = getTranslatedText('grandTotal'); f1.classList.add('grand-total-label');
        const f2 = fRow.insertCell(); f2.textContent = `${getTranslatedText('totalTasksOverall')}: ${formatNumberToEnglish(grandTotalTasks)}`; f2.classList.add('grand-total-value');
        const f3 = fRow.insertCell(); f3.colSpan = 2; f3.textContent = `${getTranslatedText('totalTimeOverall')}: ${formatNumberToEnglish(formatTotalMinutesToHHMMSS(grandTotalTime))}`; f3.classList.add('grand-total-value');
        
        let gBal = 0;
        // recordsArray contains plain record objects (already mapped via getDocData)
        recordsArray.forEach(r => {
            const a = accountsMap.get(r.accountId);
            let p = a ? (a.defaultPricePerHour || 0) : 0;
            if (userCustomRatesMap.has(r.accountId)) p = userCustomRatesMap.get(r.accountId);
            gBal += ((r.totalTime || 0) / 60) * p;
        });
        const f4 = fRow.insertCell(); f4.colSpan = 2; f4.textContent = `${formatNumberToEnglish(gBal.toFixed(2))} ${getTranslatedText('currencyUnit')}`; f4.classList.add('grand-total-value');

    } catch (error) {
        showToastMessage(`${getTranslatedText('errorLoadingRecords')}: ${error.message}`, 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Admin Panel Logic
const renderAdminPanel = async () => {
    if (!loggedInUser || loggedInUser.id !== 'admin') {
        showPage(loginPage);
        showToastMessage(getTranslatedText('unauthorizedAccess'), 'error'); // Show unauthorized message
        return;
    }
    showLoadingIndicator(true); // Start loading indicator for admin panel
    try {
        // Unsubscribe from previous listener if exists to prevent multiple listeners
        if (unsubscribeUsers) {
            unsubscribeUsers();
            unsubscribeUsers = null;
        }

        // Set up new onSnapshot listener for real-time user status updates
        const usersCollectionRef = collection(db, 'users');
        unsubscribeUsers = onSnapshot(usersCollectionRef, async (snapshot) => {
            allUsers = snapshot.docs.map(getDocData);
            await loadAndDisplayUsers(); // This will re-render the users table with updated status
            // Also re-render employee rates as user activity affects total hours/balance calculations
            await renderEmployeeRatesAndTotals();
        }, (error) => {
            console.error("Error listening to users collection:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        });


        // These functions now use cached data
        // loadAndDisplayUsers() will be called by onSnapshot
        await loadAndDisplayAccounts();
        await loadAndDisplayTaskDefinitions();
        await populateFilters(); // Populate all filter dropdowns
        // Clear filter fields on load
        recordFilterDate.value = ''; // Clear date filter
        recordFilterUser.value = ''; // Clear user filter (sets to "All Users")
        recordFilterAccount.value = ''; // Clear account filter
        recordFilterTask.value = ''; // Clear task filter

        // Initial load of work records with pagination
        lastVisibleRecord = null;
        allRecordsLoaded = false;
        await loadAndDisplayWorkRecords(null, null, null, null, RECORDS_PER_PAGE); // Load first 50 records

        // renderEmployeeRatesAndTotals() will be called by onSnapshot
    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Admin: Manage Users
const loadAndDisplayUsers = async () => {
    usersTableBody.innerHTML = '';
    try {
        // Use cached allUsers data
        if (allUsers.length === 0) {
            const row = usersTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 4; // Adjusted colspan for new status column
            cell.textContent = getTranslatedText('noDataToShow');
            cell.style.textAlign = 'center';
        } else {
            const now = Date.now();
            allUsers.forEach(user => { // Iterate over cached users
                // Skip rendering admin user in this table
                if (user.id === 'admin') return;

                const row = usersTableBody.insertRow();
                row.insertCell().textContent = user.name;
                row.insertCell().textContent = formatNumberToEnglish(user.pin);

                // Status Column Logic
                const statusCell = row.insertCell();
                let statusText = '';
                let statusTooltip = '';
                let statusColor = '';

                if (user.lastActivityTimestamp) {
                    const lastActivityTime = user.lastActivityTimestamp.toDate().getTime();
                    const diffMs = now - lastActivityTime;

                    if (diffMs < USER_ONLINE_THRESHOLD_MS) { // Less than 1 minute (actively online)
                        if (user.currentAccountId && user.currentTaskDefinitionId) {
                            // User is on Start Work page and selected account/task
                            statusText = getTranslatedText('onlineOnAccountTask', {
                                account: user.currentAccountName,
                                task: user.currentTaskDefinitionName
                            });
                            statusColor = '#3498DB'; // Blue for working on a task

                            // --- Calculate Session Details for Tooltip ---
                            let netSessionMinutes = 0;
                            let totalDelayMinutes = 0;
                            let totalSessionMinutes = 0;

                            if (user.sessionStartTime) {
                                const sessionStartMs = user.sessionStartTime.toDate().getTime();
                                const currentSessionDurationMs = now - sessionStartMs;
                                totalSessionMinutes = currentSessionDurationMs / (60 * 1000); // in minutes

                                if (user.lastRecordedTaskTimestamp) {
                                    const lastRecordedTimeMs = user.lastRecordedTaskTimestamp.toDate().getTime();
                                    const timeSinceLastRecordMs = now - lastRecordedTimeMs;
                                    const maxTimingMinutes = getMaxTimingForTask(user.currentTaskDefinitionId);
                                    // Grace period: max task timing + 1 minute (converted to milliseconds)
                                    const delayThresholdMs = (maxTimingMinutes * 60 * 1000) + (1 * 60 * 1000);

                                    if (timeSinceLastRecordMs > delayThresholdMs) {
                                        totalDelayMinutes = (timeSinceLastRecordMs - delayThresholdMs) / (60 * 1000); // in minutes
                                    }
                                }
                                netSessionMinutes = totalSessionMinutes - totalDelayMinutes;
                            }

                            statusTooltip = `${getTranslatedText('totalSessionTime')}: ${formatNumberToEnglish(formatMinutesToMMSS(totalSessionMinutes))}`;

                        } else {
                            // User is online but not on a specific task (dashboard, track work, or selecting)
                            statusText = getTranslatedText('onlineButNotWorking');
                            statusColor = '#F39C12'; // Orange for online but idle
                        }
                    } else if (diffMs < USER_RECENTLY_ONLINE_THRESHOLD_MS) { // Less than USER_RECENTLY_ONLINE_THRESHOLD_MS (5 minutes)
                        const minutes = Math.floor(diffMs / (60 * 1000));
                        const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);
                        statusText = getTranslatedText('onlineSince', {
                            minutes: formatNumberToEnglish(minutes),
                            seconds: formatNumberToEnglish(seconds)
                        });
                        statusColor = '#2ECC71'; // Green for recently online
                    } else { // Offline (more than USER_RECENTLY_ONLINE_THRESHOLD_MS)
                        const activityDate = new Date(lastActivityTime);
                        const formattedDate = activityDate.toLocaleDateString(currentLanguage, { day: 'numeric', month: 'short', year: 'numeric' });
                        const formattedTime = activityDate.toLocaleTimeString(currentLanguage, { hour: '2-digit', minute: '2-digit' });
                        statusText = getTranslatedText('lastActivity', {
                            date: formattedDate,
                            time: formattedTime
                        });
                        statusColor = '#95A5A6'; // Gray for offline
                    }
                } else {
                    statusText = getTranslatedText('notSet'); // If no activity recorded yet
                    statusColor = '#95A5A6';
                }

                statusCell.textContent = statusText;
                if (statusTooltip) {
                    statusCell.title = statusTooltip;
                }
                statusCell.style.color = statusColor;

                const actionCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = getTranslatedText('deleteBtn');
                deleteBtn.classList.add('admin-action-btntp', 'delete'); // Use admin-action-btntp for consistency
                deleteBtn.addEventListener('click', () => {
                    showConfirmationModal(getTranslatedText('confirmDeleteUser', { name: user.name }), async () => {
                        showLoadingIndicator(true);
                        deleteBtn.disabled = true;
                        deleteBtn.textContent = getTranslatedText('deleting');
                        try {
                            await deleteDoc(doc(db, 'users', user.id));
                            showToastMessage(getTranslatedText('userDeletedSuccess'), 'success');
                            await fetchAllStaticData(); // Re-fetch all static data after deletion
                            // loadAndDisplayUsers() will be called by onSnapshot
                            await populateFilters(); // Update all filter dropdowns
                            // renderEmployeeRatesAndTotals() will be called by onSnapshot
                        } catch (err) {
                            showToastMessage(getTranslatedText('errorAddingUser'), 'error'); // Reusing translation key
                        } finally {
                            showLoadingIndicator(false);
                            deleteBtn.disabled = false;
                            deleteBtn.textContent = getTranslatedText('deleteBtn');
                        }
                    }, () => {
                        // Do nothing if cancelled
                    });
                });
                actionCell.appendChild(deleteBtn);
            });
        }
    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

const addUser = async () => { // Renamed for clarity
    const name = newUserNameInput.value.trim();
    const pin = newUserPINInput.value.trim();

    clearInputError(newUserNameInput, newUserNameInputError);
    clearInputError(newUserPINInput, newUserPINInputError);

    let isValid = true;
    if (!name) {
        showInputError(newUserNameInput, newUserNameInputError, 'requiredField');
        isValid = false;
    }
    if (pin.length !== 8 || !/^\d+$/.test(pin)) { // Ensure PIN is 8 digits and numeric
        showInputError(newUserPINInput, newUserPINInputError, 'invalidPinLength');
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    showLoadingIndicator(true);
    addUserBtn.disabled = true;
    addUserBtn.textContent = getTranslatedText('adding');
    try {
        const usersCollectionRef = collection(db, 'users');
        const existingUserQueryRef = query(usersCollectionRef, where('pin', '==', pin), limit(1));
        const existingUserSnapshot = await getDocs(existingUserQueryRef);
        if (!existingUserSnapshot.empty) {
            showInputError(newUserPINInput, newUserPINInputError, 'pinAlreadyUsed');
            showToastMessage(getTranslatedText('pinAlreadyUsed'), 'error');
            return;
        }

        await addDoc(usersCollectionRef, {
            name: name,
            pin: pin,
            role: 'user',
            lastActivityTimestamp: serverTimestamp(),
            currentAccountId: null, // Initialize new fields
            currentAccountName: null,
            currentTaskDefinitionId: null,
            currentTaskDefinitionName: null,
            lastRecordedTaskTimestamp: null,
            sessionStartTime: null // Initialize session start time for new users
        });
        showToastMessage(getTranslatedText('userAddedSuccess'), 'success');
        newUserNameInput.value = '';
        newUserPINInput.value = '';
        await fetchAllStaticData(); // Re-fetch all static data after adding
        // loadAndDisplayUsers() will be called by onSnapshot
        await populateFilters(); // Re-populate all filters after adding a new user
        // renderEmployeeRatesAndTotals() will be called by onSnapshot
    } catch (error) {
        showToastMessage(getTranslatedText('errorAddingUser'), 'error');
    } finally {
        showLoadingIndicator(false);
        addUserBtn.disabled = false;
        addUserBtn.textContent = getTranslatedText('addUserBtn');
    }
};

// Admin: Manage Accounts (Updated for defaultPricePerHour)
const loadAndDisplayAccounts = async () => {
    accountsTableBody.innerHTML = '';
    try {
        // Use cached allAccounts data
        if (allAccounts.length === 0) {
            const row = accountsTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 4; // Adjusted colspan for account type column
            cell.textContent = getTranslatedText('noDataToShow');
            cell.style.textAlign = 'center';
        } else {
            allAccounts.forEach(account => { // Iterate over cached accounts
                const row = accountsTableBody.insertRow();
                row.insertCell().textContent = account.name;
                row.insertCell().textContent = formatNumberToEnglish((account.defaultPricePerHour || 0).toFixed(2)); // Display default price
                const acctypeLabel = account.acctype ? getTranslatedText(`acctype${account.acctype}`) : getTranslatedText('notSet');
                row.insertCell().textContent = acctypeLabel;
                const actionCell = row.insertCell();
                const editBtn = document.createElement('button');
                editBtn.textContent = getTranslatedText('modify');
                editBtn.classList.add('admin-action-btntp', 'edit');
                editBtn.addEventListener('click', () => {
                    // Open modal to edit account
                    currentEditingAccountId = account.id;
                    editAccountNameInput.value = account.name || '';
                    editAccountPriceInput.value = (account.defaultPricePerHour != null) ? String(account.defaultPricePerHour) : '';
                    editAccountTypeSelect.value = account.acctype ? String(account.acctype) : '1';
                    clearInputError(editAccountNameInput, editAccountNameError);
                    clearInputError(editAccountPriceInput, editAccountPriceError);
                    editAccountModal.style.display = 'flex';
                });
                actionCell.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = getTranslatedText('deleteBtn');
                deleteBtn.classList.add('admin-action-btntp', 'delete'); // Use admin-action-btntp for consistency
                deleteBtn.addEventListener('click', () => {
                    showConfirmationModal(getTranslatedText('confirmDeleteAccount', { name: account.name }), async () => {
                        showLoadingIndicator(true);
                        deleteBtn.disabled = true;
                        deleteBtn.textContent = getTranslatedText('deleting');
                        try {
                            await deleteDoc(doc(db, 'accounts', account.id));
                            showToastMessage(getTranslatedText('accountDeletedSuccess'), 'success');
                            await fetchAllStaticData(); // Re-fetch all static data after deletion
                            await loadAndDisplayAccounts(); // Reload after delete
                            await renderEmployeeRatesAndTotals(); // Update employee rates table
                            await populateFilters(); // Update all filter dropdowns
                        } catch (err) {
                            showToastMessage(getTranslatedText('errorAddingAccount'), 'error'); // Reusing translation key
                        } finally {
                            showLoadingIndicator(false);
                            deleteBtn.disabled = false;
                            deleteBtn.textContent = getTranslatedText('deleteBtn');
                        }
                    }, () => {
                        // Do nothing if cancelled
                    });
                });
                actionCell.appendChild(deleteBtn);
            });
        }
    }
    catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

const addAccount = async () => { // Renamed for clarity
    const name = newAccountNameInput.value.trim();
    const defaultPrice = parseFloat(newAccountPriceInput.value); // Get default price

    clearInputError(newAccountNameInput, newAccountNameInputError);
    clearInputError(newAccountPriceInput, newAccountPriceInputError);

    let isValid = true;
    if (!name) {
        showInputError(newAccountNameInput, newAccountNameInputError, 'requiredField');
        isValid = false;
    }
    if (isNaN(defaultPrice) || defaultPrice < 0) { // Validate price
        showInputError(newAccountPriceInput, newAccountPriceInputError, 'invalidNumber');
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    showLoadingIndicator(true);
    addAccountBtn.disabled = true;
    addAccountBtn.textContent = getTranslatedText('adding');
    try {
        const accountsCollectionRef = collection(db, 'accounts');
        const existingAccountQueryRef = query(accountsCollectionRef, where('name', '==', name), limit(1));
        const existingAccountSnapshot = await getDocs(existingAccountQueryRef);
        if (!existingAccountSnapshot.empty) {
            showInputError(newAccountNameInput, newAccountNameInputError, 'accountExists');
            showToastMessage(getTranslatedText('accountExists'), 'error');
            return;
        }

        const acctypeValue = newAccountTypeSelect ? Number(newAccountTypeSelect.value || 1) : 1;
        await addDoc(accountsCollectionRef, { name: name, defaultPricePerHour: defaultPrice, acctype: acctypeValue }); // Save default price and account type
        showToastMessage(getTranslatedText('accountAddedSuccess'), 'success');
        newAccountNameInput.value = '';
        newAccountPriceInput.value = ''; // Clear price input
        if (newAccountTypeSelect) newAccountTypeSelect.value = '1';
        await fetchAllStaticData(); // Re-fetch all static data after adding
        await loadAndDisplayAccounts();
        await renderEmployeeRatesAndTotals(); // Update employee rates table
        await populateFilters(); // Update all filter dropdowns
    } catch (error) {
        showToastMessage(getTranslatedText('errorAddingAccount'), 'error');
    } finally {
        showLoadingIndicator(false);
        addAccountBtn.disabled = false;
        addAccountBtn.textContent = getTranslatedText('addAccountBtn');
    }
};

// Admin: Manage Task Definitions (Updated for minutes and seconds input)
const loadAndDisplayTaskDefinitions = async () => {
    tasksDefinitionTableBody.innerHTML = '';
    try {
        // Use cached allTaskDefinitions data
        if (allTaskDefinitions.length === 0) {
            const row = tasksDefinitionTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 3;
            cell.textContent = getTranslatedText('noDataToShow');
            cell.style.textAlign = 'center';
        } else {
            allTaskDefinitions.forEach(task => { // Iterate over cached tasks
                const row = tasksDefinitionTableBody.insertRow();
                row.insertCell().textContent = task.name;

                const timingsCell = row.insertCell();
                if (task.timings && task.timings.length > 0) {
                    // Display timings in MM:SS format with English digits
                    const timingStrings = task.timings.map(t => formatNumberToEnglish(formatMinutesToMMSS(t)));
                    timingsCell.textContent = timingStrings.join(', ');
                } else {
                    timingsCell.textContent = getTranslatedText('noTimings'); // Or empty
                }

                const actionCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = getTranslatedText('deleteBtn');
                deleteBtn.classList.add('admin-action-btntp', 'delete'); // Use admin-action-btntp for consistency
                deleteBtn.addEventListener('click', () => {
                    showConfirmationModal(getTranslatedText('confirmDeleteTask', { name: task.name }), async () => {
                        showLoadingIndicator(true);
                        deleteBtn.disabled = true;
                        deleteBtn.textContent = getTranslatedText('deleting');
                        try {
                            await deleteDoc(doc(db, 'tasks', task.id));
                            showToastMessage(getTranslatedText('taskDeletedSuccess'), 'success');
                            await fetchAllStaticData(); // Re-fetch all static data after deletion
                            await loadAndDisplayTaskDefinitions(); // Reload after delete
                            await populateFilters(); // Update all filter dropdowns
                        } catch (err) {
                            showToastMessage(getTranslatedText('errorAddingTask'), 'error'); // Reusing translation key
                        } finally {
                            showLoadingIndicator(false);
                            deleteBtn.disabled = false;
                            deleteBtn.textContent = getTranslatedText('deleteBtn');
                        }
                    }, () => {
                        // Do nothing if cancelled
                    });
                });
                actionCell.appendChild(deleteBtn);
            });
        }
    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

const addTimingField = () => { // Renamed for clarity
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

    const timingGroupDiv = document.createElement('div');
    timingGroupDiv.classList.add('timing-input-group'); // Apply the new flex styling
    timingGroupDiv.appendChild(minutesInput);
    timingGroupDiv.appendChild(secondsInput);

    newTimingsContainer.appendChild(timingGroupDiv);
};

const addTaskDefinition = async () => { // Renamed for clarity
    const name = newTaskNameInput.value.trim();
    clearInputError(newTaskNameInput, newTaskNameInputError);
    // Clear error for all timing inputs
    newTimingsContainer.querySelectorAll('input').forEach(input => {
        clearInputError(input, newTimingsInputError); // newTimingsInputError is for the container
    });

    let isValid = true;
    if (!name) {
        showInputError(newTaskNameInput, newTaskNameInputError, 'requiredField');
        isValid = false;
    }

    const timingInputsMinutes = newTimingsContainer.querySelectorAll('.new-task-timing-minutes');
    const timingInputsSeconds = newTimingsContainer.querySelectorAll('.new-task-timing-seconds');
    const timings = [];
    let hasValidTimings = false;

    timingInputsMinutes.forEach((minInput, index) => {
        const secInput = timingInputsSeconds[index];
        const minutes = parseInt(minInput.value);
        const seconds = parseInt(secInput.value);

        // Check if both are empty, then skip this pair (allow empty pairs if not the only input)
        if (minInput.value === '' && secInput.value === '') {
            return;
        }

        if (!isNaN(minutes) && minutes >= 0 && !isNaN(seconds) && seconds >= 0 && seconds < 60) {
            const totalMinutes = minutes + (seconds / 60);
            timings.push(totalMinutes);
            hasValidTimings = true;
        } else {
            // If fields are not empty but invalid
            showInputError(minInput, newTimingsInputError, 'invalidTimeInput'); // Point to the first invalid input
            showInputError(secInput, newTimingsInputError, 'invalidTimeInput');
            isValid = false;
        }
    });

    if (!hasValidTimings && isValid) { // If no valid timings were added and no other errors
        showInputError(newTimingsContainer.querySelector('.new-task-timing-minutes') || newTimingsContainer, newTimingsInputError, 'enterTaskNameTiming');
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    showLoadingIndicator(true);
    addTaskDefinitionBtn.disabled = true;
    addTaskDefinitionBtn.textContent = getTranslatedText('adding');
    try {
        const tasksCollectionRef = collection(db, 'tasks');
        const existingTaskQueryRef = query(tasksCollectionRef, where('name', '==', name), limit(1));
        const existingTaskSnapshot = await getDocs(existingTaskQueryRef);
        if (!existingTaskSnapshot.empty) {
            showInputError(newTaskNameInput, newTaskNameInputError, 'taskExists');
            showToastMessage(getTranslatedText('taskExists'), 'error');
            return;
        }

        await addDoc(tasksCollectionRef, { name: name, timings: timings });
        showToastMessage(getTranslatedText('taskAddedSuccess'), 'success');
        newTaskNameInput.value = '';
        newTimingsContainer.innerHTML = `
            <div class="timing-input-group">
                <input type="number" class="new-task-timing-minutes" placeholder="${getTranslatedText('minutesPlaceholder')}" min="0" data-key="minutesPlaceholder">
                <input type="number" class="new-task-timing-seconds" placeholder="${getTranslatedText('secondsPlaceholder')}" min="0" max="59" data-key="secondsPlaceholder">
            </div>
        `; // Reset to one pair
        await fetchAllStaticData(); // Re-fetch all static data after adding
        await loadAndDisplayTaskDefinitions();
        await populateFilters(); // Update all filter dropdowns
    } catch (error) {
        showToastMessage(getTranslatedText('errorAddingTask'), 'error');
    } finally {
        showLoadingIndicator(false);
        addTaskDefinitionBtn.disabled = false;
        addTaskDefinitionBtn.textContent = getTranslatedText('addTaskBtn');
    }
};

// Admin: Manage Work Records
const populateFilters = async () => {
    // Populate User Filter
    recordFilterUser.innerHTML = `<option value="">${getTranslatedText('allUsers')}</option>`;
    allUsers.forEach(user => {
        if (user.id === 'admin') return;
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        recordFilterUser.appendChild(option);
    });

    // Populate Account Filter
    recordFilterAccount.innerHTML = `<option value="">${getTranslatedText('allAccounts')}</option>`;
    allAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = account.name;
        recordFilterAccount.appendChild(option);
    });

    // Populate Task Filter
    recordFilterTask.innerHTML = `<option value="">${getTranslatedText('allTasks')}</option>`;
    allTaskDefinitions.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.name;
        recordFilterTask.appendChild(option);
    });
};


const loadAndDisplayWorkRecords = async (userId = null, date = null, accountId = null, taskDefinitionId = null, limitCount = RECORDS_PER_PAGE, append = false) => {
    showLoadingIndicator(true);
    try {
        let recordsQuery = query(collection(db, 'workRecords'), orderBy('timestamp', 'desc'));

        if (userId) {
            recordsQuery = query(recordsQuery, where('userId', '==', userId));
        }
        if (accountId) {
            recordsQuery = query(recordsQuery, where('accountId', '==', accountId));
        }
        if (taskDefinitionId) {
            recordsQuery = query(recordsQuery, where('taskDefinitionId', '==', taskDefinitionId));
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            recordsQuery = query(recordsQuery,
                where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
                where('timestamp', '<=', Timestamp.fromDate(endOfDay))
            );
        }

        // Apply pagination
        if (append && lastVisibleRecord) {
            recordsQuery = query(recordsQuery, startAfter(lastVisibleRecord));
        }
        if (limitCount > 0) { // Apply limit if it's a positive number
            recordsQuery = query(recordsQuery, limit(limitCount));
        }

        const recordsSnapshot = await getDocs(recordsQuery);

        if (!append) { // Clear table only if not appending
            workRecordsTableBody.innerHTML = '';
        }

        if (recordsSnapshot.empty && !append) { // If no records found and not appending
            const row = workRecordsTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 6;
            cell.textContent = getTranslatedText('noMatchingRecords');
            cell.style.textAlign = 'center';
            loadMoreRecordsBtn.style.display = 'none';
            loadAllRecordsBtn.style.display = 'none';
            allRecordsLoaded = true;
            return;
        }

        recordsSnapshot.forEach(documentSnapshot => {
            const record = getDocData(documentSnapshot);
            const row = workRecordsTableBody.insertRow();
            // Use optional chaining for robustness against missing fields in old records
            row.insertCell().textContent = record.userName || 'N/A';
            row.insertCell().textContent = record.accountName || 'N/A';
            row.insertCell().textContent = record.taskDefinitionName || 'N/A';

            const totalTimeCell = row.insertCell();
            totalTimeCell.textContent = formatNumberToEnglish(formatMinutesToMMSS(record.totalTime || 0));

            const taskCountsByTiming = {};
            if (record.recordedTimings && Array.isArray(record.recordedTimings)) {
                record.recordedTimings.forEach(rt => {
                    const timingKey = Math.round((rt.timing || 0) * 1000).toString();
                    taskCountsByTiming[timingKey] = (taskCountsByTiming[timingKey] || 0) + 1;
                });
            }

            const tooltipContent = Object.keys(taskCountsByTiming)
                .map(timingKey => {
                    const count = taskCountsByTiming[timingKey];
                    const displayTimingMinutes = parseFloat(timingKey) / 1000;
                    return getTranslatedText('tasksSummaryTooltip', {
                        count: formatNumberToEnglish(count),
                        time: formatNumberToEnglish(formatMinutesToMMSS(displayTimingMinutes))
                    });
                })
                .join('\n');

            totalTimeCell.title = tooltipContent;

            row.insertCell().textContent = record.timestamp ? new Date(record.timestamp.toDate()).toLocaleDateString(currentLanguage, { day: 'numeric', month: 'short' }) : 'N/A';

            const actionCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.textContent = getTranslatedText('editRecord');
            editBtn.classList.add('admin-action-btntp');
            editBtn.addEventListener('click', () => openEditRecordModal(record));
            actionCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = getTranslatedText('deleteBtn');
            deleteBtn.classList.add('admin-action-btntp', 'delete');
            deleteBtn.addEventListener('click', () => {
                showConfirmationModal(getTranslatedText('confirmDeleteRecord', { name: record.userName || 'N/A' }), async () => {
                    showLoadingIndicator(true);
                    deleteBtn.disabled = true;
                    deleteBtn.textContent = getTranslatedText('deleting');
                    try {
                        await deleteDoc(doc(db, 'workRecords', record.id));
                        showToastMessage(getTranslatedText('recordDeletedSuccess'), 'success');
                        // Invalidate caches affected by this deletion
                        try { userWorkRecordsCache.delete(record.userId); } catch (e) {}
                        allWorkRecordsCache = null;
                        // Reload records from scratch after deletion to ensure correct pagination state
                        lastVisibleRecord = null;
                        allRecordsLoaded = false;
                        await loadAndDisplayWorkRecords(recordFilterUser.value, recordFilterDate.value, recordFilterAccount.value, recordFilterTask.value, RECORDS_PER_PAGE);
                        await renderEmployeeRatesAndTotals();
                    } catch (err) {
                        showToastMessage(getTranslatedText('errorDeletingRecord'), 'error');
                    } finally {
                        showLoadingIndicator(false);
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = getTranslatedText('deleteBtn');
                    }
                }, () => {
                    // Do nothing if cancelled
                });
            });
            actionCell.appendChild(deleteBtn);
        });

        // Update pagination state
        if (recordsSnapshot.docs.length < limitCount) {
            allRecordsLoaded = true;
            loadMoreRecordsBtn.style.display = 'none';
            loadAllRecordsBtn.style.display = 'none';
        } else {
            lastVisibleRecord = recordsSnapshot.docs[recordsSnapshot.docs.length - 1];
            loadMoreRecordsBtn.style.display = 'inline-block';
            loadAllRecordsBtn.style.display = 'inline-block';
            loadMoreRecordsBtn.textContent = getTranslatedText('loadMoreBtn', { count: RECORDS_PER_PAGE }); // Update button text
        }
        // If no records were loaded at all (e.g., after filter), hide buttons
        if (recordsSnapshot.empty && workRecordsTableBody.rows.length === 0) {
            loadMoreRecordsBtn.style.display = 'none';
            loadAllRecordsBtn.style.display = 'none';
        }

    } catch (error) {
        if (error.code === 'failed-precondition' && error.message.includes('The query requires an index')) {
            showToastMessage(`Error: Firestore index missing. ${error.message}`, 'error');
        } else {
            showToastMessage(`${getTranslatedText('errorLoadingRecords')}: ${error.message}`, 'error');
        }
    } finally {
        showLoadingIndicator(false);
    }
};

const handleLoadMoreRecords = async () => {
    if (allRecordsLoaded) return;
    loadMoreRecordsBtn.disabled = true;
    loadMoreRecordsBtn.textContent = getTranslatedText('loading'); // Use a generic loading text
    await loadAndDisplayWorkRecords(
        recordFilterUser.value === "" ? null : recordFilterUser.value,
        recordFilterDate.value === "" ? null : recordFilterDate.value,
        recordFilterAccount.value === "" ? null : recordFilterAccount.value,
        recordFilterTask.value === "" ? null : recordFilterTask.value,
        RECORDS_PER_PAGE,
        true // Append new records
    );
    loadMoreRecordsBtn.disabled = false;
    loadMoreRecordsBtn.textContent = getTranslatedText('loadMoreBtn', { count: RECORDS_PER_PAGE });
};

const handleLoadAllRecords = async () => {
    if (allRecordsLoaded) return;
    loadAllRecordsBtn.disabled = true;
    loadAllRecordsBtn.textContent = getTranslatedText('loading'); // Use a generic loading text
    loadMoreRecordsBtn.disabled = true; // Also disable load more

    // Fetch all remaining records
    await loadAndDisplayWorkRecords(
        recordFilterUser.value === "" ? null : recordFilterUser.value,
        recordFilterDate.value === "" ? null : recordFilterDate.value,
        recordFilterAccount.value === "" ? null : recordFilterAccount.value,
        recordFilterTask.value === "" ? null : recordFilterTask.value,
        0, // Limit to 0 to fetch all
        true // Append new records
    );
    allRecordsLoaded = true; // All records are now loaded
    loadMoreRecordsBtn.style.display = 'none'; // Hide both buttons
    loadAllRecordsBtn.style.display = 'none';
    loadAllRecordsBtn.disabled = false;
    loadAllRecordsBtn.textContent = getTranslatedText('loadAllBtn');
};


// Edit Record Modal Functions
const openEditRecordModal = (record) => {
    currentEditingRecordId = record.id;

    // Clear previous errors
    clearInputError(editAccountSelect, editAccountSelectError);
    clearInputError(editTaskTypeSelect, editTaskTypeSelectError);
    clearInputError(editTotalTasksCount, editTotalTasksCountError);
    clearInputError(editTotalTime, editTotalTimeError);
    clearInputError(editRecordDate, editRecordDateError);
    clearInputError(editRecordTime, editRecordTimeError);

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

    editTotalTasksCount.value = formatNumberToEnglish(record.totalTasksCount || 0);
    editTotalTime.value = formatNumberToEnglish((record.totalTime || 0).toFixed(2)); // Keep as decimal for input

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

const saveEditedRecord = async () => { // Renamed for clarity
    if (!currentEditingRecordId) return;

    const newAccountId = editAccountSelect.value;
    const newTaskDefinitionId = editTaskTypeSelect.value;
    const newTotalTasksCount = parseInt(editTotalTasksCount.value);
    const newTotalTime = parseFloat(editTotalTime.value);
    const newDate = editRecordDate.value;
    const newTime = editRecordTime.value;

    // Clear previous errors
    clearInputError(editAccountSelect, editAccountSelectError);
    clearInputError(editTaskTypeSelect, editTaskTypeSelectError);
    clearInputError(editTotalTasksCount, editTotalTasksCountError);
    clearInputError(editTotalTime, editTotalTimeError);
    clearInputError(editRecordDate, editRecordDateError);
    clearInputError(editRecordTime, editRecordTimeError);

    let isValid = true;
    if (!newAccountId) { showInputError(editAccountSelect, editAccountSelectError, 'requiredField'); isValid = false; }
    if (!newTaskDefinitionId) { showInputError(editTaskTypeSelect, editTaskTypeSelectError, 'requiredField'); isValid = false; }
    if (isNaN(newTotalTasksCount) || newTotalTasksCount < 0) { showInputError(editTotalTasksCount, editTotalTasksCountError, 'invalidNumber'); isValid = false; }
    if (isNaN(newTotalTime) || newTotalTime < 0) { showInputError(editTotalTime, editTotalTimeError, 'invalidNumber'); isValid = false; }
    if (!newDate) { showInputError(editRecordDate, editRecordDateError, 'requiredField'); isValid = false; }
    if (!newTime) { showInputError(editRecordTime, editRecordTimeError, 'requiredField'); isValid = false; }

    if (!isValid) {
        showToastMessage(getTranslatedText('invalidEditData'), 'error');
        return;
    }

    const newAccountName = allAccounts.find(acc => acc.id === newAccountId)?.name || 'Unknown';
    const newTaskDefinitionName = allTaskDefinitions.find(task => task.id === newTaskDefinitionId)?.name || 'Unknown';

    // Combine date and time into a new Date object for timestamp
    const newTimestampDate = new Date(`${newDate}T${newTime}:00`); // Assuming time is HH:MM
    const newTimestamp = Timestamp.fromDate(newTimestampDate); // Use direct import Timestamp

    showLoadingIndicator(true);
    saveEditedRecordBtn.disabled = true;
    saveEditedRecordBtn.textContent = getTranslatedText('updating');
    try {
        const recordDocRef = doc(db, 'workRecords', currentEditingRecordId);
        await updateDoc(recordDocRef, {
            accountId: newAccountId,
            accountName: newAccountName,
            taskDefinitionId: newTaskDefinitionId,
            taskDefinitionName: newTaskDefinitionName,
            totalTasksCount: newTotalTasksCount,
            totalTime: newTotalTime,
            timestamp: newTimestamp, // Update the main timestamp of the record
            lastModified: serverTimestamp()
        });
        showToastMessage(getTranslatedText('recordUpdatedSuccess'), 'success');
        editRecordModal.style.display = 'none';
        currentEditingRecordId = null;
        // After editing, reload records from scratch to ensure correct pagination state
        lastVisibleRecord = null;
        allRecordsLoaded = false;
        await loadAndDisplayWorkRecords(recordFilterUser.value, recordFilterDate.value, recordFilterAccount.value, recordFilterTask.value, RECORDS_PER_PAGE);
        await renderEmployeeRatesAndTotals(); // Update employee rates table
    } catch (error) {
        showToastMessage(getTranslatedText('errorUpdatingRecord'), 'error');
    } finally {
        showLoadingIndicator(false);
        saveEditedRecordBtn.disabled = false;
        saveEditedRecordBtn.textContent = getTranslatedText('saveChangesBtn');
            // Clear caches so updated record shows correctly in filtered views
            userWorkRecordsCache.clear();
            allWorkRecordsCache = null;
    }
};

// --- New Admin Section: Employee Rates and Totals ---

const renderEmployeeRatesAndTotals = async () => {
    employeeRatesTableBody.innerHTML = '';
    showLoadingIndicator(true);
    try {
        // Use cached allUsers and allAccounts
        const users = allUsers;
        const accounts = allAccounts;
        const accountsMap = new Map(accounts.map(acc => [acc.id, acc])); // Map for quick lookup

        // Use global cache for all work records and apply admin month filter
        const selectedMonth = (globalMonthFilter && globalMonthFilter.value) ? globalMonthFilter.value : getCurrentMonthValue();
        if (!allWorkRecordsCache) {
            try {
                const workRecordsCol = collection(db, 'workRecords');
                const workRecordsSnapshot = await getDocs(workRecordsCol);
                allWorkRecordsCache = workRecordsSnapshot.docs.map(getDocData);
                // Apply best month choice based on loaded records
                applyBestMonthFromRecords(allWorkRecordsCache);
            } catch (err) {
                allWorkRecordsCache = [];
            }
        }
        let workRecords = filterRecordsByMonth(allWorkRecordsCache || [], selectedMonth);
        // لا تقم بتغيير الشهر تلقائياً إذا لم توجد بيانات، فقط أظهر "لا توجد بيانات"

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
            userData.totalHours += (record.totalTime || 0) / 60; // Convert to hours
            userData.workedAccounts.set(record.accountId, (userData.workedAccounts.get(record.accountId) || 0) + (record.totalTime || 0)); // Store total minutes per account

            // Calculate balance for this record using applicable price
            let pricePerHour = accountsMap.get(record.accountId)?.defaultPricePerHour || 0;
            if (customRatesMap.has(record.userId) && customRatesMap.get(record.userId).has(record.accountId)) {
                pricePerHour = customRatesMap.get(record.userId).get(record.accountId).customPricePerHour;
            }
            userData.totalBalance += ((record.totalTime || 0) / 60) * pricePerHour;
        });

        // --- Leader payroll: also compute and render a per-employee summary using same filtered workRecords ---
        try {
            await renderLeaderPayroll();
        } catch (e) {
            console.error('Leader payroll render error:', e);
        }

        users.forEach(user => {
            // Skip admin user in this table
            if (user.id === 'admin') return;

            const userData = employeeWorkData.get(user.id) || { totalHours: 0, totalBalance: 0, workedAccounts: new Map() };

            // Get accounts the user has worked on
            const userWorkedAccountIds = Array.from(userData.workedAccounts.keys());
            const accountsWorkedOn = userWorkedAccountIds.map(id => accountsMap.get(id)).filter(Boolean);

            if (accountsWorkedOn.length === 0) {
                // If user hasn't worked on any account, display a single row for the user with "No data"
                const row = employeeRatesTableBody.insertRow();
                row.insertCell().textContent = ''; // Empty cell for icon
                row.insertCell().textContent = user.name;
                row.insertCell().textContent = getTranslatedText('noDataToShow'); // Account Name
                row.insertCell().textContent = getTranslatedText('notSet'); // Default Price
                row.insertCell().textContent = getTranslatedText('notSet'); // Custom Price
                row.insertCell().textContent = getTranslatedText('notSet'); // Account Total Time
                row.insertCell().textContent = getTranslatedText('notSet'); // Account Balance
                row.insertCell().textContent = formatTotalMinutesToArabicText(userData.totalHours * 60); // Total Hours
                row.insertCell().textContent = `${formatNumberToEnglish(userData.totalBalance.toFixed(2))} ${getTranslatedText('currencyUnit')}`; // Total Balance
            } else {
                let isFirstRowForUser = true;
                accountsWorkedOn.forEach(account => {
                    let defaultPrice = account.defaultPricePerHour || 0;
                    let customRateData = customRatesMap.get(user.id)?.get(account.id);
                    let customPrice = customRateData?.customPricePerHour || null;
                    let customRateDocId = customRateData?.docId || null;

                    const row = employeeRatesTableBody.insertRow();

                    // New: Icon cell
                    const iconCell = row.insertCell();
                    const editIcon = document.createElement('span');
                    editIcon.classList.add('edit-icon-circle');
                    editIcon.innerHTML = '<i class="fas fa-pencil-alt"></i>'; // Pencil icon
                    editIcon.addEventListener('click', () => openEditEmployeeRateModal(user.id, user.name, account.id, account.name, defaultPrice, customPrice, customRateDocId));
                    iconCell.appendChild(editIcon);

                    // Employee Name (span rows if multiple accounts for same user)
                    if (isFirstRowForUser) {
                        const cell = row.insertCell();
                        cell.textContent = user.name;
                        cell.rowSpan = accountsWorkedOn.length; // Span for all accounts this user worked on
                    }

                    row.insertCell().textContent = account.name;
                    row.insertCell().textContent = formatNumberToEnglish(defaultPrice.toFixed(2));

                    const customPriceCell = row.insertCell();
                    customPriceCell.textContent = customPrice !== null ? formatNumberToEnglish(customPrice.toFixed(2)) : getTranslatedText('notSet');

                    // New: Account Total Time (HH:MM:SS format with tooltip for minutes:seconds)
                    const accountTotalMinutes = userData.workedAccounts.get(account.id) || 0;
                    const accountTotalTimeCell = row.insertCell();
                    accountTotalTimeCell.textContent = formatNumberToEnglish(formatTotalMinutesToHHMMSS(accountTotalMinutes));
                    accountTotalTimeCell.title = `${formatNumberToEnglish(accountTotalMinutes.toFixed(2))} ${getTranslatedText('minutesUnit')}`; // Tooltip with total minutes

                    // New: Account Balance
                    const accountBalanceCell = row.insertCell();
                    const accountPricePerHour = customPrice !== null ? customPrice : defaultPrice;
                    const accountBalance = (accountTotalMinutes / 60) * accountPricePerHour;
                    accountBalanceCell.textContent = `${formatNumberToEnglish(accountBalance.toFixed(2))} ${getTranslatedText('currencyUnit')}`;

                    // Total Hours and Total Balance (only for the first row of each user)
                    if (isFirstRowForUser) {
                        const totalHoursCell = row.insertCell();
                        totalHoursCell.textContent = formatTotalMinutesToArabicText(userData.totalHours * 60);
                        totalHoursCell.rowSpan = accountsWorkedOn.length;

                        const totalBalanceCell = row.insertCell();
                        totalBalanceCell.textContent = `${formatNumberToEnglish(userData.totalBalance.toFixed(2))} ${getTranslatedText('currencyUnit')}`;
                        totalBalanceCell.rowSpan = accountsWorkedOn.length;
                        isFirstRowForUser = false;
                    }
                });
            }
        });

    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Render Leader Payroll: aggregated per employee for selected month and payment actions
const renderLeaderPayroll = async () => {
    if (!leaderPayrollTableBody) return;
    leaderPayrollTableBody.innerHTML = '';
    showLoadingIndicator(true);

    try {
        const selectedMonth = (globalMonthFilter && globalMonthFilter.value) ? globalMonthFilter.value : getCurrentMonthValue();
        if (!allWorkRecordsCache) {
            try {
                const workRecordsCol = collection(db, 'workRecords');
                const workRecordsSnapshot = await getDocs(workRecordsCol);
                allWorkRecordsCache = workRecordsSnapshot.docs.map(getDocData);
                applyBestMonthFromRecords(allWorkRecordsCache);
            } catch (err) {
                allWorkRecordsCache = [];
            }
        }

        const workRecords = filterRecordsByMonth(allWorkRecordsCache || [], selectedMonth);

        // Aggregate per user
        const perUser = new Map(); // userId -> { name, totalMinutes, totalBalance, accountsSet }
        const accountsMap = new Map(allAccounts.map(a=>[a.id,a]));
        const userAccountRatesCol = collection(db, 'userAccountRates');
        const userRatesSnapshot = await getDocs(userAccountRatesCol);
        const userRates = userRatesSnapshot.docs.map(getDocData);
        const customRatesMap = new Map();
        userRates.forEach(r=>{
            if (!customRatesMap.has(r.userId)) customRatesMap.set(r.userId, new Map());
            customRatesMap.get(r.userId).set(r.accountId, r.customPricePerHour);
        });

        workRecords.forEach(rec => {
            if (!perUser.has(rec.userId)) perUser.set(rec.userId, { name: rec.userName || 'N/A', totalMinutes:0, totalBalance:0, accounts: new Set() });
            const u = perUser.get(rec.userId);
            u.totalMinutes += (rec.totalTime || 0);
            u.accounts.add(rec.accountId);
            const account = accountsMap.get(rec.accountId);
            let pricePerHour = account ? account.defaultPricePerHour || 0 : 0;
            if (customRatesMap.has(rec.userId) && customRatesMap.get(rec.userId).has(rec.accountId)) pricePerHour = customRatesMap.get(rec.userId).get(rec.accountId);
            u.totalBalance += ((rec.totalTime || 0) / 60) * pricePerHour;
        });

        // Fetch payments for the month to check status
        const paymentsCol = collection(db, 'payments');
        const paymentsQuery = query(paymentsCol, where('month', '==', selectedMonth));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const payments = paymentsSnapshot.docs.map(getDocData);
        const paymentsMap = new Map(); // userId -> paymentDoc
        payments.forEach(p=>{ if (p.userId) paymentsMap.set(p.userId, p); });

        // Render rows
        Array.from(perUser.entries()).sort((a,b)=>b[1].totalBalance - a[1].totalBalance).forEach(([userId, u]) => {
            // حسابات حسب النوع
            const accountsByType = { 1: [], 2: [] };
            for (const accId of u.accounts) {
                const acc = accountsMap.get(accId);
                if (acc && acc.acctype === 1) accountsByType[1].push(accId);
                else if (acc && acc.acctype === 2) accountsByType[2].push(accId);
            }
            // لكل نوع حساب (شهر واحد/شهرين) صف منفصل
            const userRecords = workRecords.filter(r => r.userId === userId && r.accountId && u.accounts.has(r.accountId));
            const types = [1,2];
            const [year, month] = selectedMonth.split('-').map(Number);
            // حساب كم نوع حساب عند هذا الموظف (لـ rowspan)
            let rowCount = 0;
            let typeHasBalance = [false, false];
            let typeData = [null, null];
            types.forEach((type, idx) => {
                let totalMinutes = 0;
                let totalBalance = 0;
                userRecords.forEach(rec => {
                    const acc = accountsMap.get(rec.accountId);
                    if (!acc || acc.acctype !== type) return;
                    let pricePerHour = acc.defaultPricePerHour || 0;
                    if (customRatesMap.has(rec.userId) && customRatesMap.get(rec.userId).has(rec.accountId)) pricePerHour = customRatesMap.get(rec.userId).get(rec.accountId);
                    totalMinutes += (rec.totalTime || 0);
                    totalBalance += ((rec.totalTime || 0) / 60) * pricePerHour;
                });
                if (totalBalance > 0) {
                    rowCount++;
                    typeHasBalance[idx] = true;
                    typeData[idx] = { totalMinutes, totalBalance, type };
                }
            });
            let firstRow = true;
            types.forEach((type, idx) => {
                if (!typeHasBalance[idx]) return;
                const { totalMinutes, totalBalance } = typeData[idx];
                const row = leaderPayrollTableBody.insertRow();
                // اسم الموظف مع rowspan فقط في أول صف
                if (firstRow) {
                    const nameCell = row.insertCell();
                    nameCell.textContent = u.name;
                    if (rowCount > 1) nameCell.rowSpan = rowCount;
                }
                firstRow = false;
                // باقي الأعمدة تظهر دائماً في كل صف
                row.insertCell().textContent = formatTotalMinutesToArabicText(totalMinutes);
                row.insertCell().textContent = formatNumberToEnglish(totalBalance.toFixed(2)) + ' ' + getTranslatedText('currencyUnit');
                row.insertCell().textContent = (type === 1 ? 'شهر واحد' : 'شهرين');
                let dueDate = '';
                if (type === 1) {
                    const nextMonth = month === 12 ? 1 : month + 1;
                    const nextYear = month === 12 ? year + 1 : year;
                    dueDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`;
                } else {
                    const after2Months = month + 2 > 12 ? (month + 2) % 12 : month + 2;
                    const after2Year = month + 2 > 12 ? year + 1 : year;
                    dueDate = `${after2Year}-${String(after2Months).padStart(2, '0')}-25`;
                }
                row.insertCell().textContent = dueDate;
                const paid = paymentsMap.has(userId + '_' + type);
                row.insertCell().textContent = paid ? getTranslatedText('paidStatus') : getTranslatedText('pendingStatus');
                const actionsCell = row.insertCell();
                if (!paid) {
                    const payBtn = document.createElement('button');
                    payBtn.textContent = getTranslatedText('confirmBtn');
                    payBtn.classList.add('admin-action-btntp');
                    payBtn.addEventListener('click', () => {
                        showConfirmationModal(getTranslatedText('confirmAction'), async () => {
                            showLoadingIndicator(true);
                            try {
                                await addDoc(collection(db, 'payments'), {
                                    userId: userId + '_' + type,
                                    userName: u.name,
                                    month: selectedMonth,
                                    amount: Number(totalBalance.toFixed(2)),
                                    paidAt: serverTimestamp(),
                                    markedBy: loggedInUser ? loggedInUser.id : null,
                                    accountType: type
                                });
                                showToastMessage(getTranslatedText('markedAsPaid'), 'success');
                                await renderLeaderPayroll();
                            } catch (err) {
                                showToastMessage(getTranslatedText('error'), 'error');
                            } finally { showLoadingIndicator(false); }
                        });
                    });
                    actionsCell.appendChild(payBtn);
                } else {
                    const info = document.createElement('span'); info.textContent = '—'; actionsCell.appendChild(info);
                }
            });
        });

    } catch (err) {
        console.error(err);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const openEditEmployeeRateModal = (userId, userName, accountId, accountName, defaultPrice, customPrice, customRateDocId) => {
    currentEditingRate = { userId, accountId, docId: customRateDocId };

    clearInputError(modalCustomPriceInput, modalCustomPriceInputError);

    modalEmployeeName.textContent = userName;
    modalAccountName.textContent = accountName;
    modalDefaultPrice.textContent = formatNumberToEnglish(defaultPrice.toFixed(2));
    modalCustomPriceInput.value = customPrice !== null ? formatNumberToEnglish(customPrice) : formatNumberToEnglish(defaultPrice); // Pre-fill with custom or default

    editEmployeeRateModal.style.display = 'flex';
};

const saveCustomRate = async () => { // Renamed for clarity
    const customPrice = parseFloat(modalCustomPriceInput.value);

    clearInputError(modalCustomPriceInput, modalCustomPriceInputError);

    let isValid = true;
    if (isNaN(customPrice) || customPrice < 0) {
        showInputError(modalCustomPriceInput, modalCustomPriceInputError, 'invalidPrice');
        isValid = false;
    }

    if (!isValid) {
        showToastMessage(getTranslatedText('invalidPrice'), 'error');
        return;
    }

    showLoadingIndicator(true);
    saveCustomRateBtn.disabled = true;
    saveCustomRateBtn.textContent = getTranslatedText('updating');
    try {
        const rateData = {
            userId: currentEditingRate.userId,
            accountId: currentEditingRate.accountId,
            customPricePerHour: customPrice,
            timestamp: serverTimestamp() // Use server timestamp for creation/update time
        };

        if (currentEditingRate.docId) {
            // Update existing custom rate
            const docRef = doc(db, 'userAccountRates', currentEditingRate.docId);
            await updateDoc(docRef, rateData);
        } else {
            // Add new custom rate
            const newDocRef = await addDoc(collection(db, 'userAccountRates'), rateData);
            currentEditingRate.docId = newDocRef.id; // Store the new doc ID
        }

        showToastMessage(getTranslatedText('rateUpdated'), 'success');
        editEmployeeRateModal.style.display = 'none';
        await renderEmployeeRatesAndTotals(); // Refresh the table
        // Also update the main dashboard total balance if the logged-in user is affected
        if (loggedInUser && loggedInUser.id === currentEditingRate.userId) {
            await renderMainDashboard();
        }
    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
        saveCustomRateBtn.disabled = false;
        saveCustomRateBtn.textContent = getTranslatedText('saveChangesBtn');
    }
};

// Event listener for closing the custom rate modal
editEmployeeRateModal.querySelector('.close-button').addEventListener('click', () => {
    editEmployeeRateModal.style.display = 'none';
    currentEditingRate = { userId: null, accountId: null, docId: null };
    clearInputError(modalCustomPriceInput, modalCustomPriceInputError);
});

window.addEventListener('click', (event) => {
    if (event.target === editEmployeeRateModal) {
        editEmployeeRateModal.style.display = 'none';
        currentEditingRate = { userId: null, accountId: null, docId: null };
        clearInputError(modalCustomPriceInput, modalCustomPriceInputError);
    }
});


// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', async () => {
    checkConnectionStatus();
    loadDarkModePreference();
    setLanguage(currentLanguage); // Apply initial language translations

    // Login PIN inputs logic
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            // Allow only digits
            input.value = input.value.replace(/\D/g, '');
            if (input.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
            // Check if all 8 digits are entered
            if (pinInputs.every(i => i.value.length === 1)) {
                const fullPin = pinInputs.map(i => i.value).join('');
                if (fullPin.length === 8) { // Double check length before attempting login
                    handleLogin();
                }
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && input.value.length === 0 && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });

    // Event listeners for the new login error modal
    closeLoginErrorModalBtn.addEventListener('click', () => {
        loginErrorModal.style.display = 'none';
    });
    loginErrorModalCloseBtn.addEventListener('click', () => {
        loginErrorModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target === loginErrorModal) {
            loginErrorModal.style.display = 'none';
        }
    });

    // Check for logged-in user on load
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        try {
            loggedInUser = JSON.parse(storedUser);
            // Re-fetch all static data to ensure it's up-to-date after session load
            await fetchAllStaticData();
            if (loggedInUser.id === 'admin') {
                showPage(adminPanelPage);
                await renderAdminPanel();
            } else {
                showPage(mainDashboard);
                await renderMainDashboard();
                trackUserActivity(); // Start tracking activity for regular users
            }
        } catch (error) {
            logout(); // Log out if stored user data is corrupted
        }
    } else {
        showPage(loginPage);
        pinInputs[0].focus(); // Focus on the first PIN input
    }

    // Main Dashboard Buttons
    logoutDashboardBtn.addEventListener('click', logout);
    startWorkOptionBtn.addEventListener('click', handleStartWorkOptionClick); // Use named function
    trackWorkOptionBtn.addEventListener('click', handleTrackWorkOptionClick); // Use named function

    // Month filter for employee dashboard: re-render when changed
    if (dashboardMonthFilter) {
        dashboardMonthFilter.addEventListener('change', async () => {
            await renderMainDashboard();
        });
    }

    // Track page month filter listener
    if (trackMonthFilter) {
        trackMonthFilter.addEventListener('change', async () => {
            // If user is on track page, re-render
            if (trackWorkPage.style.display === 'flex') await renderTrackWorkPage();
        });
    }

    // Admin rates month filter listener
    if (adminRatesMonthFilter) {
        adminRatesMonthFilter.addEventListener('change', async () => {
            // Clear global cache so admin sees up-to-date records when month changes
            // (we could keep cache and just filter, but clearing ensures fresh snapshot)
            // Keep cache but re-filter from cached data
            if (adminPanelPage.style.display === 'flex') await renderEmployeeRatesAndTotals();
        });
    }

    // Global month filter: apply to all page-level month inputs and re-render current view
    if (globalMonthFilter) {
        globalMonthFilter.addEventListener('change', async () => {
            // عند تغيير الفلتر العام، أعد تحميل البيانات بناءً على الشهر المختار فقط
            if (mainDashboard.style.display === 'flex') await renderMainDashboard();
            if (trackWorkPage.style.display === 'flex') await renderTrackWorkPage();
            if (adminPanelPage.style.display === 'flex') await renderEmployeeRatesAndTotals();
            if (adminPanelPage.style.display === 'flex') await renderLeaderPayroll();
        });
    }

    // Add Admin Panel button dynamically if not already present, and only for admin
    adminPanelButton = document.getElementById('adminPanelOption');
    if (!adminPanelButton) { // Only create if it doesn't exist
        adminPanelButton = document.createElement('button');
        adminPanelButton.id = 'adminPanelOption';
        adminPanelButton.classList.add('big-option-btn');
        adminPanelButton.setAttribute('data-key', 'adminPanelTitle'); // For translation
        adminPanelButton.textContent = getTranslatedText('adminPanelTitle'); // Initial text
        mainDashboard.querySelector('.dashboard-options').appendChild(adminPanelButton);
    }
    // Hide/show admin button based on loggedInUser role (admin or leader allowed)
    if (loggedInUser && (loggedInUser.role === 'admin' || loggedInUser.role === 'leader')) {
        adminPanelButton.style.display = 'block';
    } else {
        adminPanelButton.style.display = 'none';
    }
    adminPanelButton.addEventListener('click', async () => {
        if (loggedInUser && (loggedInUser.role === 'admin' || loggedInUser.role === 'leader')) {
            showPage(adminPanelPage);
            await renderAdminPanel();
        } else {
            showToastMessage(getTranslatedText('unauthorizedAccess'), 'error');
        }
    });


    // Start Work Page Buttons
    confirmSelectionBtn.addEventListener('click', handleConfirmSelection);
    backToDashboardFromPopup.addEventListener('click', () => {
        if (currentSessionTasks.length > 0) {
            showConfirmationModal(getTranslatedText('unsavedTasksWarning'), async () => { // Made async
                currentSessionTasks = [];
                await updateLastActivityTimestamp(true); // Clear current activity status
                showPage(mainDashboard);
            }, () => {
                // Do nothing if cancelled
            });
        } else {
            // If no tasks, just go back and clear activity
            updateLastActivityTimestamp(true);
            showPage(mainDashboard);
        }
    });
    saveWorkBtn.addEventListener('click', saveWorkRecord);
    backToDashboardFromStartWork.addEventListener('click', () => {
        if (currentSessionTasks.length > 0) {
            showConfirmationModal(getTranslatedText('unsavedTasksWarning'), async () => { // Made async
                currentSessionTasks = [];
                await updateLastActivityTimestamp(true); // Clear current activity status
                showPage(mainDashboard);
            }, () => {
                // Do nothing if cancelled
            });
        } else {
            // If no tasks, just go back and clear activity
            updateLastActivityTimestamp(true);
            showPage(mainDashboard);
        }
    });

    // Track Work Page Buttons
    backToDashboardFromTrackBtn.addEventListener('click', async () => { // Made async
        await updateLastActivityTimestamp(true); // Clear current activity status
        showPage(mainDashboard);
    });

    // Admin Panel Buttons
    addUserBtn.addEventListener('click', addUser);
    addAccountBtn.addEventListener('click', addAccount);
    addTimingFieldBtn.addEventListener('click', addTimingField);
    addTaskDefinitionBtn.addEventListener('click', addTaskDefinition);
    filterRecordsBtn.addEventListener('click', async () => {
        const selectedUserId = recordFilterUser.value === "" ? null : recordFilterUser.value;
        const selectedDate = recordFilterDate.value === "" ? null : recordFilterDate.value;
        const selectedAccountId = recordFilterAccount.value === "" ? null : recordFilterAccount.value;
        const selectedTaskDefinitionId = recordFilterTask.value === "" ? null : recordFilterTask.value;

        // Reset pagination when filters change
        lastVisibleRecord = null;
        allRecordsLoaded = false;
        await loadAndDisplayWorkRecords(selectedUserId, selectedDate, selectedAccountId, selectedTaskDefinitionId, RECORDS_PER_PAGE);
    });
    loadMoreRecordsBtn.addEventListener('click', handleLoadMoreRecords); // New event listener
    loadAllRecordsBtn.addEventListener('click', handleLoadAllRecords); // New event listener

    // Admin Logout button: Unsubscribe from real-time listener before logging out
    logoutAdminBtn.addEventListener('click', async () => {
        if (unsubscribeUsers) {
            unsubscribeUsers();
            unsubscribeUsers = null;
        }
        await logout(); // Call the original logout function
    });

    // Edit Record Modal
    if (closeEditRecordModalBtn) {
        closeEditRecordModalBtn.addEventListener('click', () => {
            editRecordModal.style.display = 'none';
            // Clear errors on close
            clearInputError(editAccountSelect, editAccountSelectError);
            clearInputError(editTaskTypeSelect, editTaskTypeSelectError);
            clearInputError(editTotalTasksCount, editTotalTasksCountError);
            clearInputError(editTotalTime, editTotalTimeError);
            clearInputError(editRecordDate, editRecordDateError);
            clearInputError(editRecordTime, editRecordTimeError);
        });
    }
    saveEditedRecordBtn.addEventListener('click', saveEditedRecord);

    // Edit Employee Rate Modal
    if (editEmployeeRateModal) {
        editEmployeeRateModal.querySelector('.close-button').addEventListener('click', () => {
            editEmployeeRateModal.style.display = 'none';
            clearInputError(modalCustomPriceInput, modalCustomPriceInputError);
        });
    }
    saveCustomRateBtn.addEventListener('click', saveCustomRate);

    // Edit Account Modal event handlers
    if (closeEditAccountModalBtn) {
        closeEditAccountModalBtn.addEventListener('click', () => {
            editAccountModal.style.display = 'none';
            currentEditingAccountId = null;
        });
    }
    if (cancelEditAccountBtn) {
        cancelEditAccountBtn.addEventListener('click', () => {
            editAccountModal.style.display = 'none';
            currentEditingAccountId = null;
        });
    }
    if (saveEditedAccountBtn) {
        saveEditedAccountBtn.addEventListener('click', async () => {
            clearInputError(editAccountNameInput, editAccountNameError);
            clearInputError(editAccountPriceInput, editAccountPriceError);
            let isValid = true;
            const newName = editAccountNameInput.value.trim();
            const priceVal = parseFloat(editAccountPriceInput.value);
            const acctypeVal = Number(editAccountTypeSelect.value) === 2 ? 2 : 1;
            if (!newName) { showInputError(editAccountNameInput, editAccountNameError, 'requiredField'); isValid = false; }
            if (isNaN(priceVal) || priceVal < 0) { showInputError(editAccountPriceInput, editAccountPriceError, 'invalidNumber'); isValid = false; }
            if (!isValid) return;

            try {
                showLoadingIndicator(true);
                if (!currentEditingAccountId) throw new Error('No account selected');
                await updateDoc(doc(db, 'accounts', currentEditingAccountId), { name: newName, defaultPricePerHour: priceVal, acctype: acctypeVal });
                showToastMessage(getTranslatedText('rateUpdated') || getTranslatedText('accountAddedSuccess'), 'success');
                editAccountModal.style.display = 'none';
                currentEditingAccountId = null;
                await fetchAllStaticData();
                await loadAndDisplayAccounts();
                await renderEmployeeRatesAndTotals();
                await populateFilters();
            } catch (err) {
                console.error(err);
                showToastMessage(getTranslatedText('errorAddingAccount'), 'error');
            } finally {
                showLoadingIndicator(false);
            }
        });
    }


    // Connection Status Events
    window.addEventListener('online', () => {
        showToastMessage(getTranslatedText('internetRestored'), 'success');
    });
    window.addEventListener('offline', () => {
        showToastMessage(getTranslatedText('internetLost'), 'error');
    });

    // Language and Dark Mode buttons
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
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
});
