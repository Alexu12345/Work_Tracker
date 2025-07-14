import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"; // Updated Firebase SDK version
import { getFirestore, collection, getDocs, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Updated Firebase SDK version

// Firebase configuration (should be the same as your main app)
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

// Global DOM Elements (accessible to all functions)
const loadingIndicator = document.getElementById('loadingIndicator');
const toastMessage = document.getElementById('toastMessage');

// --- Utility Functions (moved to global scope for accessibility) ---

// Function to show/hide loading indicator
function showLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
        loadingIndicator.style.opacity = '1';
    }
}

function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.style.opacity = '0';
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
        }, 300); // Match CSS transition time
    }
}

// Function to show toast messages (notifications)
function showToastMessage(message, type) {
    if (!toastMessage) return; // Defensive check
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
}

// Helper to adjust color (darken/lighten) for Chart.js
const adjustColor = (hex, percent) => {
    let f = parseInt(hex.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = (f >> 8) & 0x00ff,
        B = (f & 0x0000ff);
    return "#" + (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
    ).toString(16).slice(1);
};

// Helper function to format hours (decimal) into HH:MM:SS
function formatHoursToHHMMSS(decimalHours) {
    if (typeof decimalHours !== 'number' || isNaN(decimalHours) || decimalHours < 0) {
        return "00:00:00";
    }

    const totalSeconds = Math.floor(decimalHours * 3600); // Convert hours to total seconds
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Pad with leading zeros if necessary
    const pad = (num) => num.toString().padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded event fired."); // Debug log

    // DOM Elements (specific to DOMContentLoaded scope)
    const langArBtn = document.getElementById('langArBtn');
    const langEnBtn = document.getElementById('langEnBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = darkModeToggle ? darkModeToggle.querySelector('i') : null;

    const filterTypeSelect = document.getElementById('filterType');
    const dateFilterDiv = document.getElementById('dateFilter');
    const weekFilterDiv = document.getElementById('weekFilter');
    const monthFilterDiv = document.getElementById('monthFilter');
    const customFilterDiv = document.getElementById('customFilter');
    const filterDateInput = document.getElementById('filterDate');
    const filterWeekInput = document.getElementById('filterWeek');
    const filterMonthInput = document.getElementById('filterMonth');
    const filterStartDateInput = document.getElementById('filterStartDate');
    const filterEndDateInput = document.getElementById('filterEndDate');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const performanceChartCanvas = document.getElementById('performanceChart');
    const ladderContainer = document.querySelector('.ladder-container');
    const backToAdminPanelBtn = document.getElementById('backToAdminPanelBtn');

    // New DOM elements for account performance
    const accountPerformanceChartCanvas = document.getElementById('accountPerformanceChart');
    const accountSummaryTableBody = document.querySelector('#accountSummaryTable tbody');
    const noAccountDataMessage = document.getElementById('noAccountDataMessage');


    let performanceChart = null; // Chart.js instance for user performance
    let accountChart = null; // Chart.js instance for account performance
    let cachedWorkRecords = [];
    let cachedUsers = [];

    // --- Utility Functions (remaining within DOMContentLoaded scope) ---

    // Function to get document data with ID
    const getDocData = (documentSnapshot) => {
        if (documentSnapshot.exists()) {
            return { id: documentSnapshot.id, ...documentSnapshot.data() };
        }
        return null;
    };

    // Internet connection status check
    const checkConnectionStatus = () => {
        console.log("Checking connection status..."); // Debug log
        if (!navigator.onLine) {
            showToastMessage(getTranslatedText('noInternet'), 'error');
        }
    };

    // Dark Mode Functions (copied from main app for consistency)
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
        // Re-render charts to apply new colors
        if (performanceChart) {
            applyFiltersAndRender(); // Re-process data and render chart
        }
        if (accountChart) {
            applyFiltersAndRender(); // Re-process data and render chart
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

    // Language Support (copied from main app for consistency)
    const translations = {
        'ar': {
            'adminDashboardTitle': 'لوحة تحكم المدير',
            'filterBy': 'تصفية حسب:',
            'allTime': 'جميع الأوقات',
            'specificDay': 'يوم معين',
            'specificWeek': 'أسبوع معين',
            'specificMonth': 'شهر معين',
            'customRange': 'نطاق مخصص',
            'selectDate': 'اختر تاريخ:',
            'selectWeek': 'اختر أسبوع:',
            'selectMonth': 'اختر شهر:',
            'startDate': 'تاريخ البدء:',
            'endDate': 'تاريخ الانتهاء:',
            'applyFilter': 'تطبيق التصفية',
            'performanceChartTitle': 'أداء المستخدمين',
            'topEmployeesTitle': 'أفضل 3 موظفين', // Changed from 5 to 3
            'backToAdminPanel': 'رجوع للوحة تحكم المدير',
            'noDataToShow': 'لا توجد بيانات لعرضها لهذه الفترة.',
            'notRated': 'غير مقيم',
            'acceptable': 'مقبول',
            'good': 'جيد',
            'veryGood': 'جيد جداً',
            'excellent': 'ممتاز',
            'legendary': 'أسطوري',
            'errorLoadingData': 'حدث خطأ في تحميل البيانات. الرجاء المحاولة مرة أخرى.',
            'totalHours': 'إجمالي الساعات',
            'rank': 'الترتيب',
            'name': 'الاسم',
            'hours': 'ساعات',
            'noTopEmployees': 'لا يوجد موظفين لعرضهم.',
            'userPerformance': 'أداء المستخدم',
            'totalWorkHours': 'إجمالي ساعات العمل',
            'category': 'الفئة', // Added for tooltip
            'accountPerformanceChartTitle': 'أداء الحسابات', // New translation
            'accountSummaryTableTitle': 'ملخص أداء الحسابات', // New translation
            'accountNameHeader': 'اسم الحساب', // New translation
            'totalHoursHeader': 'إجمالي الساعات', // New translation
            'noAccountData': 'لا توجد بيانات حسابات لعرضها لهذه الفترة.' // New translation
        },
        'en': {
            'adminDashboardTitle': 'Admin Dashboard',
            'filterBy': 'Filter By:',
            'allTime': 'All Time',
            'specificDay': 'Specific Day',
            'specificWeek': 'Specific Week',
            'specificMonth': 'Specific Month',
            'customRange': 'Custom Range',
            'selectDate': 'Select Date:',
            'selectWeek': 'Select Week:',
            'selectMonth': 'Select Month:',
            'startDate': 'Start Date:',
            'endDate': 'End Date:',
            'applyFilter': 'Apply Filter',
            'performanceChartTitle': 'User Performance',
            'topEmployeesTitle': 'Top 3 Employees', // Changed from 5 to 3
            'backToAdminPanel': 'Back to Admin Panel',
            'noDataToShow': 'No data to display for this period.',
            'notRated': 'Not Rated',
            'acceptable': 'Acceptable',
            'good': 'Good',
            'veryGood': 'Very Good',
            'excellent': 'Excellent',
            'legendary': 'Legendary',
            'errorLoadingData': 'An error occurred while loading data. Please try again.',
            'totalHours': 'Total Hours',
            'rank': 'Rank',
            'name': 'Name',
            'hours': 'Hours',
            'noTopEmployees': 'No employees to display.',
            'userPerformance': 'User Performance',
            'totalWorkHours': 'Total Work Hours',
            'category': 'Category', // Added for tooltip
            'accountPerformanceChartTitle': 'Account Performance', // New translation
            'accountSummaryTableTitle': 'Account Performance Summary', // New translation
            'accountNameHeader': 'Account Name', // New translation
            'totalHoursHeader': 'Total Hours', // New translation
            'noAccountData': 'No account data to display for this period.' // New translation
        }
    };

    let currentLanguage = localStorage.getItem('appLanguage') || 'ar';

    const setLanguage = (lang) => {
        currentLanguage = lang;
        localStorage.setItem('appLanguage', lang);
        applyTranslations();
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        // Re-render charts to apply new colors and direction
        applyFiltersAndRender();
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

    // --- Data Fetching and Processing ---

    const fetchAllData = async () => {
        showLoadingIndicator(); // Now globally available
        try {
            const usersCollectionRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);
            cachedUsers = usersSnapshot.docs.map(getDocData);

            const workRecordsCollectionRef = collection(db, 'workRecords');
            const recordsSnapshot = await getDocs(workRecordsCollectionRef); // Fetch all records
            cachedWorkRecords = recordsSnapshot.docs.map(getDocData);

            console.log("All users and work records fetched and cached.");
        } catch (error) {
            console.error("Error fetching all data:", error);
            showToastMessage(getTranslatedText('errorLoadingData'), 'error');
        } finally {
            hideLoadingIndicator(); // Now globally available
        }
    };

    const processDataForDashboard = (records, users, filterType, filterValue1, filterValue2) => {
        let filteredRecords = [...records]; // Work with a copy

        // Debugging logs for filtering
        console.log("processDataForDashboard - Initial records count:", records.length);
        console.log("processDataForDashboard - Filter Type:", filterType, "Value1:", filterValue1, "Value2:", filterValue2);


        // Apply date filters
        if (filterType === 'day' && filterValue1) {
            const selectedDate = new Date(filterValue1);
            selectedDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(selectedDate);
            nextDay.setDate(selectedDate.getDate() + 1);

            filteredRecords = filteredRecords.filter(record => {
                const recordDate = record.timestamp instanceof Timestamp ? record.timestamp.toDate() : new Date(record.timestamp);
                return recordDate >= selectedDate && recordDate < nextDay;
            });
            console.log("Filtered by day. Records count:", filteredRecords.length);
        } else if (filterType === 'week' && filterValue1) {
            const [year, weekNum] = filterValue1.split('-W').map(Number);
            const firstDayOfYear = new Date(year, 0, 1);
            const days = (weekNum - 1) * 7;
            const startOfWeek = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() + days));
            startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 6) % 7); // Adjust to Monday

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7); // End of Sunday

            filteredRecords = filteredRecords.filter(record => {
                const recordDate = record.timestamp instanceof Timestamp ? record.timestamp.toDate() : new Date(record.timestamp);
                return recordDate >= startOfWeek && recordDate < endOfWeek;
            });
            console.log("Filtered by week. Records count:", filteredRecords.length);
        } else if (filterType === 'month' && filterValue1) {
            const [year, month] = filterValue1.split('-').map(Number);
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0); // Last day of the month

            filteredRecords = filteredRecords.filter(record => {
                const recordDate = record.timestamp instanceof Timestamp ? record.timestamp.toDate() : new Date(record.timestamp);
                return recordDate >= startOfMonth && recordDate <= endOfMonth;
            });
            console.log("Filtered by month. Records count:", filteredRecords.length);
        } else if (filterType === 'custom' && filterValue1 && filterValue2) {
            const startDate = new Date(filterValue1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(filterValue2);
            endDate.setHours(23, 59, 59, 999);

            filteredRecords = filteredRecords.filter(record => {
                const recordDate = record.timestamp instanceof Timestamp ? record.timestamp.toDate() : new Date(record.timestamp);
                return recordDate >= startDate && recordDate <= endDate;
            });
            console.log("Filtered by custom range. Records count:", filteredRecords.length);
        }
        
        console.log("Filtered records after date filtering:", filteredRecords);

        // Aggregate total hours per user
        const userHours = {};
        let overallTotalUserHours = 0; // Initialize overall total hours for users

        filteredRecords.forEach(record => {
            if (!userHours[record.userId]) {
                userHours[record.userId] = 0;
            }
            
            let totalMinutes = 0;
            // Check if record.totalTime exists and is a number
            if (typeof record.totalTime === 'number') {
                totalMinutes = record.totalTime;
                // console.log(`DEBUG: Record ID: ${record.id}, Raw totalTime (Minutes): ${totalMinutes}`); // Keep for debugging if needed
            } else {
                console.warn(`WARN: Record ID: ${record.id}, Unexpected totalTime type or value:`, record.totalTime);
                // Default to 0 if totalTime is invalid
                totalMinutes = 0; 
            }

            // Convert minutes to hours and add to user's total
            const hoursToAdd = totalMinutes / 60;
            userHours[record.userId] += hoursToAdd; 
            overallTotalUserHours += hoursToAdd; // Add to overall total for users
        });

        console.log("DEBUG: Aggregated user hours (before category assignment):", userHours);
        console.log("DEBUG: Overall total user hours:", overallTotalUserHours);

        // Map user IDs to names and calculate performance scores/categories
        let performanceData = []; // Use let because we will filter it
        const userTotalHours = []; // For top employees

        users.forEach(user => {
            const totalHours = userHours[user.id] || 0;
            let category = getTranslatedText('notRated');
            let color = '#888888'; // Grey for Not Rated

            // Ensure totalHours is a valid number before comparison
            if (typeof totalHours !== 'number' || isNaN(totalHours)) {
                console.warn(`WARN: User ${user.name} has invalid totalHours: ${totalHours}. Setting to 0.`);
                totalHours = 0;
            }

            if (totalHours >= 2 && totalHours < 3) {
                category = getTranslatedText('acceptable');
                color = '#ffc107'; // Yellow
            } else if (totalHours >= 3 && totalHours < 6) { 
                category = getTranslatedText('good');
                color = '#28a745'; // Green
            } else if (totalHours >= 6 && totalHours < 9) { 
                category = getTranslatedText('veryGood');
                color = '#17a2b8'; // Teal
            } else if (totalHours >= 9 && totalHours < 11) { 
                category = getTranslatedText('excellent');
                color = '#007bff'; // Blue
            } else if (totalHours >= 11) {
                category = getTranslatedText('legendary');
                color = '#6f42c1'; // Purple
            }

            performanceData.push({
                userName: user.name,
                totalHours: totalHours,
                category: category,
                color: color
            });

            userTotalHours.push({
                name: user.name,
                hours: totalHours
            });
        });

        // Filter out users with 0 total hours for the chart
        performanceData = performanceData.filter(user => user.totalHours > 0);

        // Sort performance data by total hours descending
        performanceData.sort((a, b) => b.totalHours - a.totalHours);
        console.log("DEBUG: Performance data (sorted, filtered for >0 hours):", performanceData);

        // Sort user total hours for top 3
        userTotalHours.sort((a, b) => b.hours - a.hours);
        console.log("DEBUG: Top employees data (sorted):", userTotalHours);

        // --- Account Performance Data Processing ---
        const accountHours = {};
        let overallTotalAccountHours = 0;

        filteredRecords.forEach(record => {
            // Use accountId as the key for aggregation
            const accId = record.accountId;
            const accName = record.accountName || `Unknown Account (${accId})`; // Fallback name

            if (!accountHours[accId]) {
                accountHours[accId] = { name: accName, totalMinutes: 0 };
            }

            let totalMinutes = 0;
            if (typeof record.totalTime === 'number') {
                totalMinutes = record.totalTime;
            } else {
                console.warn(`WARN: Record ID: ${record.id}, Unexpected totalTime type or value for account:`, record.totalTime);
                totalMinutes = 0;
            }
            accountHours[accId].totalMinutes += totalMinutes;
        });

        const accountPerformanceData = Object.values(accountHours).map(acc => {
            const hours = acc.totalMinutes / 60;
            overallTotalAccountHours += hours; // Sum for account chart
            return {
                accountName: acc.name,
                totalHours: hours
            };
        }).filter(acc => acc.totalHours > 0); // Filter out accounts with 0 hours

        accountPerformanceData.sort((a, b) => b.totalHours - a.totalHours);
        console.log("DEBUG: Account performance data (sorted, filtered for >0 hours):", accountPerformanceData);
        console.log("DEBUG: Overall total account hours:", overallTotalAccountHours);


        return { 
            performanceData, 
            topEmployees: userTotalHours.slice(0, 3), // Changed slice to 3
            overallTotalUserHours, // Pass overall total for user chart tooltip
            accountPerformanceData, // New: account data
            overallTotalAccountHours // New: overall total for account chart tooltip
        }; 
    };

    // --- Chart Rendering ---

    // Modified renderPerformanceChart to accept performanceData directly
    const renderPerformanceChart = (labels, data, colors, overallTotalUserHours, performanceDataForTooltip) => { 
        if (performanceChart) {
            performanceChart.destroy();
        }

        const isDarkMode = document.body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#00e6e6' : '#2c3e50'; // Neon for dark, dark for light
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const borderColor = isDarkMode ? '#00e6e6' : '#007bff'; // Neon for dark, blue for light

        performanceChart = new Chart(performanceChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: getTranslatedText('totalWorkHours'),
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColor,
                    borderWidth: 1,
                    borderRadius: 5, // Rounded bars
                    hoverBackgroundColor: colors.map(color => adjustColor(color, -20)), // Darken on hover
                    hoverBorderColor: borderColor,
                    hoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000, // Animation duration
                    easing: 'easeOutQuart' // Smooth easing
                },
                plugins: {
                    legend: {
                        display: false // Hide legend as colors are tied to performance categories
                    },
                    title: {
                        display: true,
                        text: getTranslatedText('userPerformance'),
                        color: textColor,
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        rtl: (currentLanguage === 'ar'),
                        callbacks: {
                            label: function(context) {
                                const userName = context.label;
                                const hours = context.raw;
                                // Use the passed performanceDataForTooltip
                                const userPerfData = performanceDataForTooltip.find(d => d.userName === userName);
                                const category = userPerfData?.category || getTranslatedText('notRated');
                                
                                let percentage = 0;
                                if (overallTotalUserHours > 0) { // Avoid division by zero
                                    percentage = (hours / overallTotalUserHours) * 100;
                                }
                                return `${userName}: ${hours.toFixed(2)} ${getTranslatedText('hours')} (${category}) - ${percentage.toFixed(2)}%`;
                            },
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: getTranslatedText('name'),
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
                            text: getTranslatedText('totalHours'),
                            color: textColor
                        },
                        ticks: {
                            color: textColor,
                            beginAtZero: true
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                }
            }
        });
    };

    // New function for Account Performance Chart
    const renderAccountPerformanceChart = (labels, data, overallTotalAccountHours) => {
        if (accountChart) {
            accountChart.destroy();
        }

        const isDarkMode = document.body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#00e6e6' : '#2c3e50';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const barColor = isDarkMode ? '#6f42c1' : '#007bff'; // Purple for dark, blue for light
        const borderColor = isDarkMode ? '#00e6e6' : '#007bff';

        accountChart = new Chart(accountPerformanceChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: getTranslatedText('totalWorkHours'),
                    data: data,
                    backgroundColor: barColor,
                    borderColor: borderColor,
                    borderWidth: 1,
                    borderRadius: 5,
                    hoverBackgroundColor: adjustColor(barColor, -20),
                    hoverBorderColor: borderColor,
                    hoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: getTranslatedText('accountPerformanceChartTitle'),
                        color: textColor,
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        rtl: (currentLanguage === 'ar'),
                        callbacks: {
                            label: function(context) {
                                const accountName = context.label;
                                const hours = context.raw;
                                let percentage = 0;
                                if (overallTotalAccountHours > 0) {
                                    percentage = (hours / overallTotalAccountHours) * 100;
                                }
                                return `${accountName}: ${hours.toFixed(2)} ${getTranslatedText('hours')} - ${percentage.toFixed(2)}%`;
                            },
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: getTranslatedText('accountNameHeader'),
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
                            text: getTranslatedText('totalHoursHeader'),
                            color: textColor
                        },
                        ticks: {
                            color: textColor,
                            beginAtZero: true
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                }
            }
        });
    };

    // --- Top Employees Rendering (Ladders) ---

    const renderTopEmployees = (records, users) => {
        // Re-process data to get top employees based on current filter
        const currentFilterType = filterTypeSelect.value;
        let currentFilterValue1 = null;
        let currentFilterValue2 = null;

        if (currentFilterType === 'day') {
            if (filterDateInput) currentFilterValue1 = filterDateInput.value;
        } else if (currentFilterType === 'week') {
            if (filterWeekInput) currentFilterValue1 = filterWeekInput.value;
        } else if (currentFilterType === 'month') {
            if (filterMonthInput) currentFilterValue1 = filterMonthInput.value;
        } else if (currentFilterType === 'custom') {
            if (filterStartDateInput) currentFilterValue1 = filterStartDateInput.value;
            if (filterEndDateInput) currentFilterValue2 = filterEndDateInput.value;
        }

        console.log("renderTopEmployees - Filter Type:", currentFilterType); 
        console.log("renderTopEmployees - Filter Value 1:", currentFilterValue1); 
        console.log("renderTopEmployees - Filter Value 2:", currentFilterValue2); 

        const { performanceData, topEmployees, overallTotalUserHours, accountPerformanceData, overallTotalAccountHours } = processDataForDashboard(records, users, currentFilterType, currentFilterValue1, currentFilterValue2);

        if (!ladderContainer) return; // Defensive check
        ladderContainer.innerHTML = ''; // Clear previous ladders

        if (topEmployees.length === 0) {
            ladderContainer.innerHTML = `<p class="no-data-message">${getTranslatedText('noTopEmployees')}</p>`;
            return;
        }

        // Create ladders for top 3
        topEmployees.forEach((employee, index) => {
            const rank = index + 1;
            const ladderDiv = document.createElement('div');
            ladderDiv.classList.add('ladder-item');
            ladderDiv.style.setProperty('--rank', rank); // Use CSS variable for animation delay
            
            // Determine ladder height based on rank (example scaling)
            // Scale height based on the actual hours relative to the top employee's hours
            const maxHours = topEmployees[0].hours;
            const minHeight = 80; // Minimum height for the shortest ladder
            const maxHeight = 200; // Maximum height for the tallest ladder
            let height = minHeight;
            if (maxHours > 0) {
                // Linear scaling: (employee.hours / maxHours) * (maxHeight - minHeight) + minHeight
                height = (employee.hours / maxHours) * (maxHeight - minHeight) + minHeight;
            }
            ladderDiv.style.height = `${height}px`;

            // Add animation class
            ladderDiv.classList.add('animate-ladder');

            ladderDiv.innerHTML = `
                <div class="ladder-rank">${getTranslatedText('rank')} ${rank}</div>
                <div class="ladder-name">${employee.name}</div>
                <div class="ladder-hours">${formatHoursToHHMMSS(employee.hours)}</div> <!-- Applied new formatting function -->
                <div class="ladder-trophy">🏆</div> <!-- Simple emoji trophy -->
            `;
            ladderContainer.appendChild(ladderDiv);
        });
    };

    // New function to render account summary table
    const renderAccountSummaryTable = (accountData) => {
        if (!accountSummaryTableBody) return;

        accountSummaryTableBody.innerHTML = ''; // Clear previous data
        noAccountDataMessage.style.display = 'none'; // Hide no data message by default

        if (accountData.length === 0) {
            noAccountDataMessage.textContent = getTranslatedText('noAccountData');
            noAccountDataMessage.style.display = 'block';
            return;
        }

        accountData.forEach(account => {
            const row = accountSummaryTableBody.insertRow();
            const accountNameCell = row.insertCell();
            const totalHoursCell = row.insertCell();

            accountNameCell.textContent = account.accountName;
            totalHoursCell.textContent = formatHoursToHHMMSS(account.totalHours);
        });
    };


    // --- Filter Logic ---

    const updateFilterVisibility = () => {
        if (dateFilterDiv) dateFilterDiv.style.display = 'none';
        if (weekFilterDiv) weekFilterDiv.style.display = 'none';
        if (monthFilterDiv) monthFilterDiv.style.display = 'none';
        if (customFilterDiv) customFilterDiv.style.display = 'none';

        const selectedFilter = filterTypeSelect.value;
        if (selectedFilter === 'day') {
            if (dateFilterDiv) dateFilterDiv.style.display = 'flex';
        } else if (selectedFilter === 'week') {
            if (weekFilterDiv) weekFilterDiv.style.display = 'flex';
        } else if (selectedFilter === 'month') {
            if (monthFilterDiv) monthFilterDiv.style.display = 'flex';
        } else if (selectedFilter === 'custom') {
            if (customFilterDiv) customFilterDiv.style.display = 'flex';
        }
    };

    const applyFiltersAndRender = () => {
        const filterType = filterTypeSelect.value;
        let filterValue1 = null;
        let filterValue2 = null;

        if (filterType === 'day') {
            if (filterDateInput) filterValue1 = filterDateInput.value;
        } else if (filterType === 'week') {
            if (filterWeekInput) filterValue1 = filterWeekInput.value;
        } else if (filterType === 'month') {
            if (filterMonthInput) filterValue1 = filterMonthInput.value;
        } else if (filterType === 'custom') {
            if (filterStartDateInput) filterValue1 = filterStartDateInput.value;
            if (filterEndDateInput) filterValue2 = filterEndDateInput.value;
        }

        const { performanceData, topEmployees, overallTotalUserHours, accountPerformanceData, overallTotalAccountHours } = processDataForDashboard(cachedWorkRecords, cachedUsers, filterType, filterValue1, filterValue2);

        // Render User Performance Chart
        const userLabels = performanceData.map(d => d.userName);
        const userData = performanceData.map(d => d.totalHours);
        const userColors = performanceData.map(d => d.color); 
        renderPerformanceChart(userLabels, userData, userColors, overallTotalUserHours, performanceData); // Pass performanceData here

        // Render Top Employees Ladder
        renderTopEmployees(cachedWorkRecords, cachedUsers); // This re-calls processDataForDashboard internally to get topEmployees

        // Render Account Performance Chart
        const accountLabels = accountPerformanceData.map(d => d.accountName);
        const accountData = accountPerformanceData.map(d => d.totalHours);
        renderAccountPerformanceChart(accountLabels, accountData, overallTotalAccountHours);

        // Render Account Summary Table
        renderAccountSummaryTable(accountPerformanceData);
    };

    // --- Event Listeners ---

    if (filterTypeSelect) filterTypeSelect.addEventListener('change', updateFilterVisibility);
    if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyFiltersAndRender);
    if (backToAdminPanelBtn) backToAdminPanelBtn.addEventListener('click', () => {
        // Redirect back to the main admin panel page (assuming it's index.html)
        // You might need to adjust this path based on your actual file structure
        window.location.href = 'index.html'; 
    });

    // Event listeners for language buttons
    if (langArBtn) {
        langArBtn.addEventListener('click', () => {
            setLanguage('ar');
            langArBtn.classList.add('active');
            if (langEnBtn) langEnBtn.classList.remove('active');
        });
    }
    if (langEnBtn) {
        langEnBtn.addEventListener('click', () => {
            setLanguage('en');
            langEnBtn.classList.add('active');
            if (langArBtn) langArBtn.classList.remove('active');
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

    // --- Initial Setup ---
    checkConnectionStatus();
    loadDarkModePreference();
    setLanguage(currentLanguage); // Apply initial language translations
    updateFilterVisibility(); // Set initial filter visibility

    // Fetch all data once and then render the dashboard
    await fetchAllData();
    applyFiltersAndRender(); // Initial render with 'All Time' filter
});
