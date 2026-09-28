export type Locale = 'en' | 'hi';

const strings = {
  en: {
    dashboard: 'Dashboard',
    tenants: 'Tenants',
    ledger: 'Ledger',
    properties: 'Properties',
    settings: 'Settings',
    addTenant: 'Add Tenant',
    recordPayment: 'Record Payment',
    remindAll: 'Remind all overdue',
    noOverdue: 'No overdue tenants right now.',
    exportCsv: 'Export Payments CSV',
    upiVpa: 'UPI VPA (optional)',
    leaseStart: 'Lease Start Date',
    leaseEnd: 'Lease End Date',
    leaseExpiresSoon: 'Lease expires on',
    leaseExpired: 'Lease expired on',
    annualReport: 'Annual Report',
    expenses: 'Expenses',
    addExpense: 'Add Expense',
    vacancyOverview: 'Vacancy Overview',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    tenants: 'किरायेदार',
    ledger: 'खाता',
    properties: 'संपत्ति',
    settings: 'सेटिंग्स',
    addTenant: 'किरायेदार जोड़ें',
    recordPayment: 'भुगतान दर्ज करें',
    remindAll: 'सभी बकाया को याद दिलाएं',
    noOverdue: 'अभी कोई बकाया किरायेदार नहीं।',
    exportCsv: 'भुगतान CSV निर्यात करें',
    upiVpa: 'UPI VPA (वैकल्पिक)',
    leaseStart: 'लीज प्रारंभ तिथि',
    leaseEnd: 'लीज समाप्ति तिथि',
    leaseExpiresSoon: 'लीज समाप्त होगी',
    leaseExpired: 'लीज समाप्त हो गई',
    annualReport: 'वार्षिक रिपोर्ट',
    expenses: 'खर्च',
    addExpense: 'खर्च जोड़ें',
    vacancyOverview: 'रिक्त अवलोकन',
  },
};

let currentLocale: Locale = 'en';

export const i18n = {
  setLocale(locale: Locale) {
    currentLocale = locale;
  },
  t(key: keyof typeof strings['en']): string {
    return strings[currentLocale]?.[key] ?? strings.en[key];
  },
  getLocale(): Locale {
    return currentLocale;
  },
};
