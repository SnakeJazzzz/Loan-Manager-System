// src/utils/monthlyInterestCalculator.js
import { calculateInterest, daysBetween, parseDate } from './loanCalculations';

/**
 * Get the number of days in a specific month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {number} Number of days in the month
 */
const getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

/**
 * Get the first day of the month as YYYY-MM-DD
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {string} First day of month in YYYY-MM-DD format
 */
const getFirstDayOfMonth = (month, year) => {
  const monthStr = month.toString().padStart(2, '0');
  return `${year}-${monthStr}-01`;
};

/**
 * Get the last day of the month as YYYY-MM-DD
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {string} Last day of month in YYYY-MM-DD format
 */
const getLastDayOfMonth = (month, year) => {
  const daysInMonth = getDaysInMonth(month, year);
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = daysInMonth.toString().padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

/**
 * Check if a date is within a given month
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {boolean} True if date is in the month
 */
const isDateInMonth = (date, month, year) => {
  const firstDay = getFirstDayOfMonth(month, year);
  const lastDay = getLastDayOfMonth(month, year);
  return date >= firstDay && date <= lastDay;
};

/**
 * Get loan balance on a specific date
 * @param {Object} loan - Loan object
 * @param {Array} payments - All payments
 * @param {string} date - Date to calculate balance for
 * @returns {number} Loan balance on that date
 */
const getLoanBalanceOnDate = (loan, payments, date) => {
  // If date is before loan start, balance is 0
  if (date < loan.startDate) {
    return 0;
  }
  
  // Start with original principal
  let balance = loan.originalPrincipal;
  
  // Subtract all principal payments made before or on this date
  const loanPayments = payments
    .filter(p => p.loanId === loan.id && p.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  for (const payment of loanPayments) {
    balance -= (payment.principalPaid || 0);
  }
  
  return Math.max(0, balance);
};

/**
 * Calculate interest for a specific loan in a given month
 * @param {Object} loan - Loan object
 * @param {Array} payments - All payments
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Object} Interest details for the loan
 */
const calculateLoanMonthlyInterest = (loan, payments, month, year) => {
  const firstDayOfMonth = getFirstDayOfMonth(month, year);
  const lastDayOfMonth = getLastDayOfMonth(month, year);
  const daysInMonth = getDaysInMonth(month, year);
  
  // If loan hasn't started by end of month, no interest
  if (loan.startDate > lastDayOfMonth) {
    return {
      loanId: loan.id,
      loanNumber: loan.loanNumber || `#${loan.id}`,
      debtorName: loan.debtorName,
      totalInterest: 0,
      dailyInterest: [],
      averageBalance: 0,
      daysActive: 0
    };
  }
  
  // Calculate interest for each day of the month
  const dailyInterest = [];
  let totalInterest = 0;
  let totalBalance = 0;
  let daysActive = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const currentDate = `${year}-${month.toString().padStart(2, '0')}-${dayStr}`;
    
    // Skip if before loan start date
    if (currentDate < loan.startDate) {
      dailyInterest.push({
        date: currentDate,
        balance: 0,
        interest: 0,
        active: false
      });
      continue;
    }
    
    // Get balance for this day (considering payments)
    const balance = getLoanBalanceOnDate(loan, payments, currentDate);
    
    // If loan is paid off, no more interest
    if (balance <= 0) {
      dailyInterest.push({
        date: currentDate,
        balance: 0,
        interest: 0,
        active: false
      });
      continue;
    }
    
    // Calculate daily interest
    const dayInterest = calculateInterest(balance, loan.interestRate, 1);
    
    dailyInterest.push({
      date: currentDate,
      balance: balance,
      interest: dayInterest,
      active: true
    });
    
    totalInterest += dayInterest;
    totalBalance += balance;
    daysActive++;
  }
  
  return {
    loanId: loan.id,
    loanNumber: loan.loanNumber || `#${loan.id}`,
    debtorName: loan.debtorName,
    interestRate: loan.interestRate,
    totalInterest: totalInterest,
    dailyInterest: dailyInterest,
    averageBalance: daysActive > 0 ? totalBalance / daysActive : 0,
    daysActive: daysActive,
    startDate: loan.startDate > firstDayOfMonth ? loan.startDate : firstDayOfMonth,
    endDate: lastDayOfMonth
  };
};

/**
 * Calculate total interest for all loans in a given month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @returns {Object} Complete monthly interest breakdown
 */
export const calculateMonthlyInterest = (month, year, loans, payments) => {
  // Validate inputs
  if (!month || month < 1 || month > 12) {
    throw new Error('Invalid month. Must be between 1 and 12.');
  }
  
  if (!year || year < 1900 || year > 2100) {
    throw new Error('Invalid year.');
  }
  
  if (!Array.isArray(loans) || !Array.isArray(payments)) {
    throw new Error('Loans and payments must be arrays.');
  }
  
  const firstDayOfMonth = getFirstDayOfMonth(month, year);
  const lastDayOfMonth = getLastDayOfMonth(month, year);
  
  // Calculate interest for each loan
  const loanBreakdown = loans.map(loan => 
    calculateLoanMonthlyInterest(loan, payments, month, year)
  );
  
  // Filter out loans with no interest
  const activeLoans = loanBreakdown.filter(lb => lb.totalInterest > 0);
  
  // Calculate totals
  const totalAccrued = activeLoans.reduce((sum, lb) => sum + lb.totalInterest, 0);
  
  // Create daily breakdown for all loans combined
  const daysInMonth = getDaysInMonth(month, year);
  const dailyBreakdown = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const currentDate = `${year}-${month.toString().padStart(2, '0')}-${dayStr}`;
    
    let dailyTotal = 0;
    let activeLoansCount = 0;
    let totalDailyBalance = 0;
    
    // Sum up all loans for this day
    loanBreakdown.forEach(lb => {
      const dayData = lb.dailyInterest.find(d => d.date === currentDate);
      if (dayData && dayData.active) {
        dailyTotal += dayData.interest;
        totalDailyBalance += dayData.balance;
        activeLoansCount++;
      }
    });
    
    dailyBreakdown.push({
      date: currentDate,
      totalInterest: dailyTotal,
      totalBalance: totalDailyBalance,
      activeLoans: activeLoansCount
    });
  }
  
  // Calculate interest payments made during the month
  const monthlyPayments = payments.filter(p => 
    isDateInMonth(p.date, month, year) && p.interestPaid > 0
  );
  
  const totalPaidInMonth = monthlyPayments.reduce(
    (sum, p) => sum + (p.interestPaid || 0), 
    0
  );
  
  return {
    month: month,
    year: year,
    monthName: new Date(year, month - 1).toLocaleString('es-MX', { month: 'long' }),
    firstDay: firstDayOfMonth,
    lastDay: lastDayOfMonth,
    daysInMonth: daysInMonth,
    totalAccrued: totalAccrued,
    totalPaid: totalPaidInMonth,
    remaining: totalAccrued - totalPaidInMonth,
    loanBreakdown: loanBreakdown,
    dailyBreakdown: dailyBreakdown,
    activeLoansCount: activeLoans.length,
    paymentsInMonth: monthlyPayments,
    summary: {
      loansProcessed: loans.length,
      loansWithInterest: activeLoans.length,
      averageDailyInterest: totalAccrued / daysInMonth,
      highestDay: dailyBreakdown.reduce((max, day) => 
        day.totalInterest > max.amount ? { date: day.date, amount: day.totalInterest } : max,
        { date: null, amount: 0 }
      ),
      lowestDay: dailyBreakdown.reduce((min, day) => 
        day.totalInterest > 0 && (min.amount === null || day.totalInterest < min.amount) 
          ? { date: day.date, amount: day.totalInterest } : min,
        { date: null, amount: null }
      )
    }
  };
};

/**
 * Calculate interest for a range of months
 * @param {number} startMonth - Starting month (1-12)
 * @param {number} startYear - Starting year
 * @param {number} endMonth - Ending month (1-12)
 * @param {number} endYear - Ending year
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @returns {Array} Array of monthly interest calculations
 */
export const calculateInterestRange = (startMonth, startYear, endMonth, endYear, loans, payments) => {
  const results = [];
  
  let currentMonth = startMonth;
  let currentYear = startYear;
  
  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    results.push(calculateMonthlyInterest(currentMonth, currentYear, loans, payments));
    
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
  
  return results;
};

/**
 * Get a summary of interest for the current month
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @returns {Object} Current month's interest summary
 */
export const getCurrentMonthInterest = (loans, payments) => {
  const now = new Date();
  return calculateMonthlyInterest(now.getMonth() + 1, now.getFullYear(), loans, payments);
};

/**
 * Calculate interest from the first loan to current month
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @returns {Array} Array of monthly interest for all months with loans
 */
export const calculateAllHistoricalInterest = (loans, payments) => {
  if (!loans || loans.length === 0) {
    return [];
  }
  
  // Find the earliest loan start date
  const earliestLoan = loans.reduce((earliest, loan) => 
    !earliest || loan.startDate < earliest.startDate ? loan : earliest,
    null
  );
  
  if (!earliestLoan) {
    return [];
  }
  
  // Parse the earliest date
  const [startYear, startMonthStr] = earliestLoan.startDate.split('-');
  const startMonth = parseInt(startMonthStr);
  
  // Current date
  const now = new Date();
  const endMonth = now.getMonth() + 1;
  const endYear = now.getFullYear();
  
  return calculateInterestRange(
    startMonth, 
    parseInt(startYear), 
    endMonth, 
    endYear, 
    loans, 
    payments
  );
};

/**
 * Validate that calculated interest matches expected values
 * Useful for debugging and testing
 * @param {Object} monthlyInterest - Result from calculateMonthlyInterest
 * @param {number} expectedTotal - Expected total interest
 * @param {number} tolerance - Acceptable difference (default 0.01)
 * @returns {Object} Validation result
 */
export const validateInterestCalculation = (monthlyInterest, expectedTotal, tolerance = 0.01) => {
  const difference = Math.abs(monthlyInterest.totalAccrued - expectedTotal);
  const isValid = difference <= tolerance;
  
  return {
    isValid,
    calculated: monthlyInterest.totalAccrued,
    expected: expectedTotal,
    difference,
    percentageDiff: expectedTotal > 0 ? (difference / expectedTotal) * 100 : 0,
    details: monthlyInterest.loanBreakdown.map(lb => ({
      loan: lb.loanNumber,
      calculated: lb.totalInterest,
      days: lb.daysActive,
      avgBalance: lb.averageBalance
    }))
  };
};