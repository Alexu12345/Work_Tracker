import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBu_MfB_JXvzBFaKY-Yxze1JotejU--4as",
    authDomain: "worktrackerapp-a32af.firebaseapp.com",
    projectId: "worktrackerapp-a32af",
    storageBucket: "worktrackerapp-a32af.firebasestorage.app",
    messagingSenderId: "246595598451",
    appId: "1:246595598451:web:c6842f1618dffe765a5206"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const loadingIndicator =
    document.getElementById('loadingIndicator');

const toastMessage =
    document.getElementById('toastMessage');

function showLoadingIndicator() {
    if (!loadingIndicator) return;

    loadingIndicator.style.display = 'flex';
    loadingIndicator.style.opacity = '1';
}

function hideLoadingIndicator() {
    if (!loadingIndicator) return;

    loadingIndicator.style.opacity = '0';

    setTimeout(() => {
        loadingIndicator.style.display = 'none';
    }, 300);
}

function showToastMessage(message, type) {
    if (!toastMessage) return;

    toastMessage.textContent = message;
    toastMessage.className = `toast-message ${type}`;
    toastMessage.style.display = 'block';

    void toastMessage.offsetWidth;
    toastMessage.classList.add('show');

    setTimeout(() => {
        toastMessage.classList.remove('show');

        toastMessage.addEventListener(
            'transitionend',
            function handler() {
                toastMessage.style.display = 'none';
                toastMessage.removeEventListener(
                    'transitionend',
                    handler
                );
            },
            { once: true }
        );
    }, 3000);
}

const adjustColor = (hex, percent) => {
    const f = parseInt(hex.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = percent < 0 ? percent * -1 : percent;

    const R = f >> 16;
    const G = (f >> 8) & 0x00ff;
    const B = f & 0x0000ff;

    return "#" + (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
    ).toString(16).slice(1);
};

function formatHoursToHHMMSS(decimalHours) {
    if (
        typeof decimalHours !== 'number' ||
        isNaN(decimalHours) ||
        decimalHours < 0
    ) {
        return "00:00:00";
    }

    const totalSeconds = Math.floor(decimalHours * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => num.toString().padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/*
 * يتم استدعاء هذه الدالة بعد إدخال كلمة المرور.
 * لا نستخدم DOMContentLoaded مباشرة لأن الملف قد يتم تحميله
 * بعد انتهاء هذا الحدث.
 */
async function initializeAdminDashboard() {
    console.log("Admin dashboard initialization started.");

    const langArBtn =
        document.getElementById('langArBtn');

    const langEnBtn =
        document.getElementById('langEnBtn');

    const darkModeToggle =
        document.getElementById('darkModeToggle');

    const darkModeIcon =
        darkModeToggle
            ? darkModeToggle.querySelector('i')
            : null;

    const filterTypeSelect =
        document.getElementById('filterType');

    const dateFilterDiv =
        document.getElementById('dateFilter');

    const weekFilterDiv =
        document.getElementById('weekFilter');

    const monthFilterDiv =
        document.getElementById('monthFilter');

    const customFilterDiv =
        document.getElementById('customFilter');

    const filterDateInput =
        document.getElementById('filterDate');

    const filterWeekInput =
        document.getElementById('filterWeek');

    const filterMonthInput =
        document.getElementById('filterMonth');

    const filterStartDateInput =
        document.getElementById('filterStartDate');

    const filterEndDateInput =
        document.getElementById('filterEndDate');

    const applyFilterBtn =
        document.getElementById('applyFilterBtn');

    const performanceChartCanvas =
        document.getElementById('performanceChart');

    const ladderContainer =
        document.querySelector('.ladder-container');

    const backToAdminPanelBtn =
        document.getElementById('backToAdminPanelBtn');

    const accountPerformanceChartCanvas =
        document.getElementById('accountPerformanceChart');

    const accountSummaryTableBody =
        document.querySelector('#accountSummaryTable tbody');

    const noAccountDataMessage =
        document.getElementById('noAccountDataMessage');

    let performanceChart = null;
    let accountChart = null;

    let cachedWorkRecords = [];
    let cachedUsers = [];

    const getDocData = (documentSnapshot) => {
        if (documentSnapshot.exists()) {
            return {
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            };
        }

        return null;
    };

    const checkConnectionStatus = () => {
        if (!navigator.onLine) {
            showToastMessage(
                getTranslatedText('noInternet'),
                'error'
            );
        }
    };

    const loadDarkModePreference = () => {
        const savedMode =
            localStorage.getItem('darkMode');

        if (savedMode === 'enabled') {
            document.body.classList.add('dark-mode');
            updateDarkModeIcon(true);
        } else {
            updateDarkModeIcon(false);
        }
    };

    const toggleDarkMode = () => {
        const isDarkMode =
            document.body.classList.toggle('dark-mode');

        localStorage.setItem(
            'darkMode',
            isDarkMode ? 'enabled' : 'disabled'
        );

        updateDarkModeIcon(isDarkMode);

        if (performanceChart || accountChart) {
            applyFiltersAndRender();
        }
    };

    const updateDarkModeIcon = (isDarkMode) => {
        if (!darkModeIcon) return;

        if (isDarkMode) {
            darkModeIcon.classList.remove('fa-moon');
            darkModeIcon.classList.add('fa-sun');
        } else {
            darkModeIcon.classList.remove('fa-sun');
            darkModeIcon.classList.add('fa-moon');
        }
    };

    const translations = {
        ar: {
            adminDashboardTitle: 'لوحة تحكم المدير',
            filterBy: 'تصفية حسب:',
            allTime: 'جميع الأوقات',
            specificDay: 'يوم معين',
            specificWeek: 'أسبوع معين',
            specificMonth: 'شهر معين',
            customRange: 'نطاق مخصص',
            selectDate: 'اختر تاريخ:',
            selectWeek: 'اختر أسبوع:',
            selectMonth: 'اختر شهر:',
            startDate: 'تاريخ البدء:',
            endDate: 'تاريخ الانتهاء:',
            applyFilter: 'تطبيق التصفية',
            performanceChartTitle: 'أداء المستخدمين',
            topEmployeesTitle: 'أفضل 3 موظفين',
            backToAdminPanel: 'رجوع للوحة تحكم المدير',
            noDataToShow: 'لا توجد بيانات لعرضها لهذه الفترة.',
            notRated: 'غير مقيم',
            acceptable: 'مقبول',
            good: 'جيد',
            veryGood: 'جيد جداً',
            excellent: 'ممتاز',
            legendary: 'أسطوري',
            errorLoadingData:
                'حدث خطأ في تحميل البيانات. الرجاء المحاولة مرة أخرى.',
            totalHours: 'إجمالي الساعات',
            rank: 'الترتيب',
            name: 'الاسم',
            hours: 'ساعات',
            noTopEmployees: 'لا يوجد موظفين لعرضهم.',
            userPerformance: 'أداء المستخدم',
            totalWorkHours: 'إجمالي ساعات العمل',
            category: 'الفئة',
            accountPerformanceChartTitle: 'أداء الحسابات',
            accountSummaryTableTitle: 'ملخص أداء الحسابات',
            accountNameHeader: 'اسم الحساب',
            totalHoursHeader: 'إجمالي الساعات',
            noAccountData:
                'لا توجد بيانات حسابات لعرضها لهذه الفترة.',
            noInternet: 'لا يوجد اتصال بالإنترنت.',
            internetRestored: 'تم استعادة الاتصال بالإنترنت.',
            internetLost: 'انقطع الاتصال بالإنترنت.'
        },

        en: {
            adminDashboardTitle: 'Admin Dashboard',
            filterBy: 'Filter By:',
            allTime: 'All Time',
            specificDay: 'Specific Day',
            specificWeek: 'Specific Week',
            specificMonth: 'Specific Month',
            customRange: 'Custom Range',
            selectDate: 'Select Date:',
            selectWeek: 'Select Week:',
            selectMonth: 'Select Month:',
            startDate: 'Start Date:',
            endDate: 'End Date:',
            applyFilter: 'Apply Filter',
            performanceChartTitle: 'User Performance',
            topEmployeesTitle: 'Top 3 Employees',
            backToAdminPanel: 'Back to Admin Panel',
            noDataToShow: 'No data to display for this period.',
            notRated: 'Not Rated',
            acceptable: 'Acceptable',
            good: 'Good',
            veryGood: 'Very Good',
            excellent: 'Excellent',
            legendary: 'Legendary',
            errorLoadingData:
                'An error occurred while loading data. Please try again.',
            totalHours: 'Total Hours',
            rank: 'Rank',
            name: 'Name',
            hours: 'Hours',
            noTopEmployees: 'No employees to display.',
            userPerformance: 'User Performance',
            totalWorkHours: 'Total Work Hours',
            category: 'Category',
            accountPerformanceChartTitle: 'Account Performance',
            accountSummaryTableTitle:
                'Account Performance Summary',
            accountNameHeader: 'Account Name',
            totalHoursHeader: 'Total Hours',
            noAccountData:
                'No account data to display for this period.',
            noInternet: 'No internet connection.',
            internetRestored: 'Internet connection restored.',
            internetLost: 'Internet connection lost.'
        }
    };

    let currentLanguage =
        localStorage.getItem('appLanguage') || 'ar';

    const getTranslatedText = (key, params = {}) => {
        let text =
            translations[currentLanguage]?.[key];

        if (!text) {
            return `[${key}]`;
        }

        for (const param in params) {
            text = text.replace(
                `{${param}}`,
                params[param]
            );
        }

        return text;
    };

    const applyTranslations = () => {
        document.querySelectorAll('[data-key]')
            .forEach((element) => {
                const key =
                    element.getAttribute('data-key');

                if (
                    element.tagName === 'INPUT' &&
                    element.hasAttribute('placeholder')
                ) {
                    element.placeholder =
                        getTranslatedText(key);
                } else {
                    element.textContent =
                        getTranslatedText(key);
                }
            });
    };

    const setLanguage = (lang) => {
        if (!translations[lang]) return;

        currentLanguage = lang;

        localStorage.setItem(
            'appLanguage',
            lang
        );

        document.documentElement.setAttribute(
            'dir',
            lang === 'ar' ? 'rtl' : 'ltr'
        );

        applyTranslations();

        if (
            cachedWorkRecords.length ||
            cachedUsers.length
        ) {
            applyFiltersAndRender();
        }
    };

    const fetchAllData = async () => {
        showLoadingIndicator();

        try {
            const usersCollectionRef =
                collection(db, 'users');

            const usersSnapshot =
                await getDocs(usersCollectionRef);

            cachedUsers =
                usersSnapshot.docs.map(getDocData);

            const workRecordsCollectionRef =
                collection(db, 'workRecords');

            const recordsSnapshot =
                await getDocs(workRecordsCollectionRef);

            cachedWorkRecords =
                recordsSnapshot.docs.map(getDocData);

            console.log(
                'All users and work records fetched and cached.'
            );
        } catch (error) {
            console.error(
                'Error fetching all data:',
                error
            );

            showToastMessage(
                getTranslatedText('errorLoadingData'),
                'error'
            );
        } finally {
            hideLoadingIndicator();
        }
    };

    const processDataForDashboard = (
        records,
        users,
        filterType,
        filterValue1,
        filterValue2
    ) => {
        let filteredRecords = [...records];

        if (filterType === 'day' && filterValue1) {
            const selectedDate =
                new Date(filterValue1);

            selectedDate.setHours(0, 0, 0, 0);

            const nextDay =
                new Date(selectedDate);

            nextDay.setDate(
                selectedDate.getDate() + 1
            );

            filteredRecords =
                filteredRecords.filter((record) => {
                    const recordDate =
                        record.timestamp instanceof Timestamp
                            ? record.timestamp.toDate()
                            : new Date(record.timestamp);

                    return (
                        recordDate >= selectedDate &&
                        recordDate < nextDay
                    );
                });
        }

        if (filterType === 'week' && filterValue1) {
            const [year, weekNum] =
                filterValue1.split('-W').map(Number);

            const firstDayOfYear =
                new Date(year, 0, 1);

            const days =
                (weekNum - 1) * 7;

            const startOfWeek =
                new Date(firstDayOfYear);

            startOfWeek.setDate(
                startOfWeek.getDate() + days
            );

            startOfWeek.setDate(
                startOfWeek.getDate() -
                (startOfWeek.getDay() + 6) % 7
            );

            const endOfWeek =
                new Date(startOfWeek);

            endOfWeek.setDate(
                startOfWeek.getDate() + 7
            );

            filteredRecords =
                filteredRecords.filter((record) => {
                    const recordDate =
                        record.timestamp instanceof Timestamp
                            ? record.timestamp.toDate()
                            : new Date(record.timestamp);

                    return (
                        recordDate >= startOfWeek &&
                        recordDate < endOfWeek
                    );
                });
        }

        if (filterType === 'month' && filterValue1) {
            const [year, month] =
                filterValue1.split('-').map(Number);

            const startOfMonth =
                new Date(year, month - 1, 1);

            const endOfMonth =
                new Date(year, month, 0);

            endOfMonth.setHours(
                23,
                59,
                59,
                999
            );

            filteredRecords =
                filteredRecords.filter((record) => {
                    const recordDate =
                        record.timestamp instanceof Timestamp
                            ? record.timestamp.toDate()
                            : new Date(record.timestamp);

                    return (
                        recordDate >= startOfMonth &&
                        recordDate <= endOfMonth
                    );
                });
        }

        if (
            filterType === 'custom' &&
            filterValue1 &&
            filterValue2
        ) {
            const startDate =
                new Date(filterValue1);

            startDate.setHours(0, 0, 0, 0);

            const endDate =
                new Date(filterValue2);

            endDate.setHours(
                23,
                59,
                59,
                999
            );

            filteredRecords =
                filteredRecords.filter((record) => {
                    const recordDate =
                        record.timestamp instanceof Timestamp
                            ? record.timestamp.toDate()
                            : new Date(record.timestamp);

                    return (
                        recordDate >= startDate &&
                        recordDate <= endDate
                    );
                });
        }

        const userHours = {};
        let overallTotalUserHours = 0;

        filteredRecords.forEach((record) => {
            if (!userHours[record.userId]) {
                userHours[record.userId] = 0;
            }

            const totalMinutes =
                typeof record.totalTime === 'number'
                    ? record.totalTime
                    : 0;

            const hoursToAdd =
                totalMinutes / 60;

            userHours[record.userId] += hoursToAdd;
            overallTotalUserHours += hoursToAdd;
        });

        const performanceData = [];
        const userTotalHours = [];

        users.forEach((user) => {
            /*
             * let ضرورية لأن القيمة يتم تعديلها عند الحاجة
             */
            let totalHours =
                userHours[user.id] || 0;

            let category =
                getTranslatedText('notRated');

            let color = '#888888';

            if (
                typeof totalHours !== 'number' ||
                isNaN(totalHours)
            ) {
                totalHours = 0;
            }

            if (
                totalHours >= 2 &&
                totalHours < 3
            ) {
                category =
                    getTranslatedText('acceptable');

                color = '#ffc107';
            } else if (
                totalHours >= 3 &&
                totalHours < 6
            ) {
                category =
                    getTranslatedText('good');

                color = '#28a745';
            } else if (
                totalHours >= 6 &&
                totalHours < 9
            ) {
                category =
                    getTranslatedText('veryGood');

                color = '#17a2b8';
            } else if (
                totalHours >= 9 &&
                totalHours < 11
            ) {
                category =
                    getTranslatedText('excellent');

                color = '#007bff';
            } else if (totalHours >= 11) {
                category =
                    getTranslatedText('legendary');

                color = '#6f42c1';
            }

            performanceData.push({
                userName: user.name,
                totalHours,
                category,
                color
            });

            userTotalHours.push({
                name: user.name,
                hours: totalHours
            });
        });

        const filteredPerformanceData =
            performanceData
                .filter((user) => user.totalHours > 0)
                .sort(
                    (a, b) =>
                        b.totalHours - a.totalHours
                );

        userTotalHours.sort(
            (a, b) => b.hours - a.hours
        );

        const accountHours = {};
        let overallTotalAccountHours = 0;

        filteredRecords.forEach((record) => {
            const accountId =
                record.accountId || 'unknown';

            const accountName =
                record.accountName ||
                `Unknown Account (${accountId})`;

            if (!accountHours[accountId]) {
                accountHours[accountId] = {
                    name: accountName,
                    totalMinutes: 0
                };
            }

            const totalMinutes =
                typeof record.totalTime === 'number'
                    ? record.totalTime
                    : 0;

            accountHours[accountId].totalMinutes +=
                totalMinutes;
        });

        const accountPerformanceData =
            Object.values(accountHours)
                .map((account) => {
                    const hours =
                        account.totalMinutes / 60;

                    overallTotalAccountHours +=
                        hours;

                    return {
                        accountName: account.name,
                        totalHours: hours
                    };
                })
                .filter(
                    (account) =>
                        account.totalHours > 0
                )
                .sort(
                    (a, b) =>
                        b.totalHours - a.totalHours
                );

        return {
            performanceData:
                filteredPerformanceData,

            topEmployees:
                userTotalHours.slice(0, 3),

            overallTotalUserHours,

            accountPerformanceData,

            overallTotalAccountHours
        };
    };

    const renderPerformanceChart = (
        labels,
        data,
        colors,
        overallTotalUserHours,
        performanceDataForTooltip
    ) => {
        if (!performanceChartCanvas) return;

        if (performanceChart) {
            performanceChart.destroy();
        }

        const isDarkMode =
            document.body.classList.contains(
                'dark-mode'
            );

        const textColor =
            isDarkMode
                ? '#00e6e6'
                : '#007bff';

        const gridColor =
            isDarkMode
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.1)';

        const borderColor =
            isDarkMode
                ? '#00e6e6'
                : '#007bff';

        performanceChart =
            new Chart(
                performanceChartCanvas,
                {
                    type: 'bar',

                    data: {
                        labels,

                        datasets: [{
                            label:
                                getTranslatedText(
                                    'totalWorkHours'
                                ),

                            data,

                            backgroundColor:
                                colors,

                            borderColor,

                            borderWidth: 1,

                            borderRadius: 5,

                            hoverBackgroundColor:
                                colors.map(
                                    (color) =>
                                        adjustColor(
                                            color,
                                            -20
                                        )
                                ),

                            hoverBorderColor:
                                borderColor,

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

                                text:
                                    getTranslatedText(
                                        'userPerformance'
                                    ),

                                color: textColor,

                                font: {
                                    size: 20,
                                    weight: 'bold'
                                }
                            },

                            tooltip: {
                                rtl:
                                    currentLanguage === 'ar',

                                callbacks: {
                                    label(context) {
                                        const userName =
                                            context.label;

                                        const hours =
                                            context.raw;

                                        const userPerfData =
                                            performanceDataForTooltip
                                                .find(
                                                    (item) =>
                                                        item.userName ===
                                                        userName
                                                );

                                        const category =
                                            userPerfData?.category ||
                                            getTranslatedText(
                                                'notRated'
                                            );

                                        let percentage = 0;

                                        if (
                                            overallTotalUserHours > 0
                                        ) {
                                            percentage =
                                                (
                                                    hours /
                                                    overallTotalUserHours
                                                ) * 100;
                                        }

                                        return `${userName}: ${formatHoursToHHMMSS(hours)} - ${percentage.toFixed(2)}%`;
                                    }
                                }
                            }
                        },

                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text:
                                        getTranslatedText(
                                            'name'
                                        ),
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
                                    text:
                                        getTranslatedText(
                                            'totalHours'
                                        ),
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
                }
            );
    };

    const renderAccountPerformanceChart = (
        labels,
        data,
        overallTotalAccountHours
    ) => {
        if (!accountPerformanceChartCanvas) return;

        if (accountChart) {
            accountChart.destroy();
        }

        const isDarkMode =
            document.body.classList.contains(
                'dark-mode'
            );

        const textColor =
            isDarkMode
                ? '#00e6e6'
                : '#2c3e50';

        const gridColor =
            isDarkMode
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.1)';

        const barColor =
            isDarkMode
                ? '#6f42c1'
                : '#007bff';

        const borderColor =
            isDarkMode
                ? '#00e6e6'
                : '#007bff';

        accountChart =
            new Chart(
                accountPerformanceChartCanvas,
                {
                    type: 'bar',

                    data: {
                        labels,

                        datasets: [{
                            label:
                                getTranslatedText(
                                    'totalWorkHours'
                                ),

                            data,

                            backgroundColor:
                                barColor,

                            borderColor,

                            borderWidth: 1,

                            borderRadius: 5,

                            hoverBackgroundColor:
                                adjustColor(
                                    barColor,
                                    -20
                                ),

                            hoverBorderColor:
                                borderColor,

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

                                text:
                                    getTranslatedText(
                                        'accountPerformanceChartTitle'
                                    ),

                                color: textColor,

                                font: {
                                    size: 20,
                                    weight: 'bold'
                                }
                            },

                            tooltip: {
                                rtl:
                                    currentLanguage === 'ar',

                                callbacks: {
                                    label(context) {
                                        const accountName =
                                            context.label;

                                        const hours =
                                            context.raw;

                                        let percentage = 0;

                                        if (
                                            overallTotalAccountHours > 0
                                        ) {
                                            percentage =
                                                (
                                                    hours /
                                                    overallTotalAccountHours
                                                ) * 100;
                                        }

                                        return `${accountName}: ${formatHoursToHHMMSS(hours)} - ${percentage.toFixed(2)}%`;
                                    }
                                }
                            }
                        },

                        scales: {
                            x: {
                                title: {
                                    display: true,

                                    text:
                                        getTranslatedText(
                                            'accountNameHeader'
                                        ),

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

                                    text:
                                        getTranslatedText(
                                            'totalHoursHeader'
                                        ),

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
                }
            );
    };

    const renderTopEmployees = (
        records,
        users
    ) => {
        if (!filterTypeSelect) return;

        const currentFilterType =
            filterTypeSelect.value;

        let currentFilterValue1 = null;
        let currentFilterValue2 = null;

        if (currentFilterType === 'day') {
            currentFilterValue1 =
                filterDateInput?.value || null;
        }

        if (currentFilterType === 'week') {
            currentFilterValue1 =
                filterWeekInput?.value || null;
        }

        if (currentFilterType === 'month') {
            currentFilterValue1 =
                filterMonthInput?.value || null;
        }

        if (currentFilterType === 'custom') {
            currentFilterValue1 =
                filterStartDateInput?.value || null;

            currentFilterValue2 =
                filterEndDateInput?.value || null;
        }

        const result =
            processDataForDashboard(
                records,
                users,
                currentFilterType,
                currentFilterValue1,
                currentFilterValue2
            );

        if (!ladderContainer) return;

        ladderContainer.innerHTML = '';

        if (result.topEmployees.length === 0) {
            ladderContainer.innerHTML =
                `<p class="no-data-message">${getTranslatedText('noTopEmployees')}</p>`;

            return;
        }

        result.topEmployees.forEach(
            (employee, index) => {
                const rank = index + 1;

                const ladderDiv =
                    document.createElement('div');

                ladderDiv.classList.add(
                    'ladder-item'
                );

                ladderDiv.style.setProperty(
                    '--rank',
                    rank
                );

                const maxHours =
                    result.topEmployees[0].hours;

                const minHeight = 80;
                const maxHeight = 200;

                let height = minHeight;

                if (maxHours > 0) {
                    height =
                        (
                            employee.hours /
                            maxHours
                        ) *
                        (maxHeight - minHeight) +
                        minHeight;
                }

                ladderDiv.style.height =
                    `${height}px`;

                ladderDiv.innerHTML = `
                    <div class="ladder-rank">
                        ${getTranslatedText('rank')} ${rank}
                    </div>

                    <div class="ladder-name">
                        ${employee.name}
                    </div>

                    <div class="ladder-hours">
                        ${formatHoursToHHMMSS(employee.hours)}
                    </div>

                    <div class="ladder-trophy">
                        🏆
                    </div>
                `;

                ladderContainer.appendChild(
                    ladderDiv
                );
            }
        );
    };

    const renderAccountSummaryTable = (
        accountData
    ) => {
        if (
            !accountSummaryTableBody ||
            !noAccountDataMessage
        ) {
            return;
        }

        accountSummaryTableBody.innerHTML = '';

        noAccountDataMessage.style.display =
            'none';

        if (accountData.length === 0) {
            noAccountDataMessage.textContent =
                getTranslatedText(
                    'noAccountData'
                );

            noAccountDataMessage.style.display =
                'block';

            return;
        }

        accountData.forEach((account) => {
            const row =
                accountSummaryTableBody.insertRow();

            const accountNameCell =
                row.insertCell();

            const totalHoursCell =
                row.insertCell();

            accountNameCell.textContent =
                account.accountName;

            totalHoursCell.textContent =
                formatHoursToHHMMSS(
                    account.totalHours
                );
        });
    };

    const updateFilterVisibility = () => {
        if (!filterTypeSelect) return;

        if (dateFilterDiv) {
            dateFilterDiv.style.display = 'none';
        }

        if (weekFilterDiv) {
            weekFilterDiv.style.display = 'none';
        }

        if (monthFilterDiv) {
            monthFilterDiv.style.display = 'none';
        }

        if (customFilterDiv) {
            customFilterDiv.style.display = 'none';
        }

        const selectedFilter =
            filterTypeSelect.value;

        if (selectedFilter === 'day') {
            if (dateFilterDiv) {
                dateFilterDiv.style.display = 'flex';
            }
        }

        if (selectedFilter === 'week') {
            if (weekFilterDiv) {
                weekFilterDiv.style.display = 'flex';
            }
        }

        if (selectedFilter === 'month') {
            if (monthFilterDiv) {
                monthFilterDiv.style.display = 'flex';
            }
        }

        if (selectedFilter === 'custom') {
            if (customFilterDiv) {
                customFilterDiv.style.display = 'flex';
            }
        }
    };

    const applyFiltersAndRender = () => {
        if (!filterTypeSelect) return;

        const filterType =
            filterTypeSelect.value;

        let filterValue1 = null;
        let filterValue2 = null;

        if (filterType === 'day') {
            filterValue1 =
                filterDateInput?.value || null;
        }

        if (filterType === 'week') {
            filterValue1 =
                filterWeekInput?.value || null;
        }

        if (filterType === 'month') {
            filterValue1 =
                filterMonthInput?.value || null;
        }

        if (filterType === 'custom') {
            filterValue1 =
                filterStartDateInput?.value || null;

            filterValue2 =
                filterEndDateInput?.value || null;
        }

        const result =
            processDataForDashboard(
                cachedWorkRecords,
                cachedUsers,
                filterType,
                filterValue1,
                filterValue2
            );

        const userLabels =
            result.performanceData.map(
                (item) => item.userName
            );

        const userData =
            result.performanceData.map(
                (item) => item.totalHours
            );

        const userColors =
            result.performanceData.map(
                (item) => item.color
            );

        renderPerformanceChart(
            userLabels,
            userData,
            userColors,
            result.overallTotalUserHours,
            result.performanceData
        );

        renderTopEmployees(
            cachedWorkRecords,
            cachedUsers
        );

        const accountLabels =
            result.accountPerformanceData.map(
                (item) => item.accountName
            );

        const accountData =
            result.accountPerformanceData.map(
                (item) => item.totalHours
            );

        renderAccountPerformanceChart(
            accountLabels,
            accountData,
            result.overallTotalAccountHours
        );

        renderAccountSummaryTable(
            result.accountPerformanceData
        );
    };

    if (filterTypeSelect) {
        filterTypeSelect.addEventListener(
            'change',
            updateFilterVisibility
        );
    }

    if (applyFilterBtn) {
        applyFilterBtn.addEventListener(
            'click',
            applyFiltersAndRender
        );
    }

    if (backToAdminPanelBtn) {
        backToAdminPanelBtn.addEventListener(
            'click',
            () => {
                window.location.href = 'index.html';
            }
        );
    }

    if (langArBtn) {
        langArBtn.addEventListener(
            'click',
            () => {
                setLanguage('ar');

                langArBtn.classList.add('active');

                if (langEnBtn) {
                    langEnBtn.classList.remove('active');
                }
            }
        );
    }

    if (langEnBtn) {
        langEnBtn.addEventListener(
            'click',
            () => {
                setLanguage('en');

                langEnBtn.classList.add('active');

                if (langArBtn) {
                    langArBtn.classList.remove('active');
                }
            }
        );
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener(
            'click',
            toggleDarkMode
        );
    }

    window.addEventListener(
        'online',
        () => {
            showToastMessage(
                getTranslatedText('internetRestored'),
                'success'
            );
        }
    );

    window.addEventListener(
        'offline',
        () => {
            showToastMessage(
                getTranslatedText('internetLost'),
                'error'
            );
        }
    );

    checkConnectionStatus();
    loadDarkModePreference();
    setLanguage(currentLanguage);
    updateFilterVisibility();

    await fetchAllData();

    applyFiltersAndRender();
}

/*
 * إذا تم تحميل الملف بعد DOMContentLoaded،
 * يتم تشغيله فورًا.
 *
 * وإذا تم تحميله قبل DOMContentLoaded،
 * ينتظر حتى تجهز الصفحة.
 */
if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        initializeAdminDashboard,
        { once: true }
    );
} else {
    initializeAdminDashboard();
}
