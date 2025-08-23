// src/utils/loanCalculations.js

// Constants
const DAYS_IN_YEAR = 365;
const TIMEZONE_OFFSET = 'T12:00:00'; // Use noon to avoid timezone issues

/**
 * Calculate daily interest rate from annual rate
 * @param {number} annualRate - Annual interest rate as percentage
 * @returns {number} Daily rate as decimal
 */
export const calculateDailyRate = (annualRate) => annualRate / DAYS_IN_YEAR / 100;

/**
 * Calculate simple interest
 * @param {number} principal - Principal amount
 * @param {number} rate - Annual interest rate as percentage
 * @param {number} days - Number of days
 * @returns {number} Interest amount
 */
export const calculateInterest = (principal, rate, days) => {
  const dailyRate = calculateDailyRate(rate);
  return principal * dailyRate * days;
};

/**
 * Parse date string to Date object with consistent timezone handling
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object set to noon local time
 */
export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Ensure we have a valid date string
  if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.warn(`Invalid date format: ${dateStr}`);
    return null;
  }
  
  // Parse at noon to avoid timezone issues
  const date = new Date(dateStr + TIMEZONE_OFFSET);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date: ${dateStr}`);
    return null;
  }
  
  return date;
};

/**
 * Calculate days between two dates
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {number} Number of days between dates (always positive)
 */
export const daysBetween = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) {
    console.error(`Invalid dates for daysBetween: ${date1}, ${date2}`);
    return 0;
  }
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return days;
};

/**
 * Calculate ordered days between dates (can be negative)
 * @param {string} fromDate - Start date in YYYY-MM-DD format
 * @param {string} toDate - End date in YYYY-MM-DD format
 * @returns {number} Number of days (negative if toDate is before fromDate)
 */
export const daysFromTo = (fromDate, toDate) => {
  const d1 = parseDate(fromDate);
  const d2 = parseDate(toDate);
  
  if (!d1 || !d2) {
    console.error(`Invalid dates for daysFromTo: ${fromDate}, ${toDate}`);
    return 0;
  }
  
  const diffTime = d2.getTime() - d1.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return days;
};

/**
 * Check if date1 is before date2
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {boolean} True if date1 is before date2
 */
export const isBefore = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) return false;
  
  return d1.getTime() < d2.getTime();
};

/**
 * Check if date1 is after date2
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {boolean} True if date1 is after date2
 */
export const isAfter = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) return false;
  
  return d1.getTime() > d2.getTime();
};

/**
 * Check if date is today
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  const today = new Date().toISOString().split('T')[0];
  return date === today;
};

/**
 * Check if date is in the future
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {boolean} True if date is after today
 */
export const isFutureDate = (date) => {
  const today = new Date().toISOString().split('T')[0];
  return isAfter(date, today);
};

/**
 * Check if date is in the past
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {boolean} True if date is before today
 */
export const isPastDate = (date) => {
  const today = new Date().toISOString().split('T')[0];
  return isBefore(date, today);
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (isNaN(amount)) return '0.00';
  return `${Math.abs(amount).toFixed(2)}`;
};

/**
 * Format date for display (DD/MM/YYYY)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return '';
  }
  
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Format date for display with day name
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} Formatted date with day name
 */
export const formatDateLong = (date) => {
  const d = parseDate(date);
  if (!d) return '';
  
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Mexico_City'
  };
  
  return d.toLocaleDateString('es-MX', options);
};

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
export const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Validate date string format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid YYYY-MM-DD format
 */
export const isValidDateFormat = (dateStr) => {
  if (!dateStr) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

/**
 * Format date for loan number
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Date formatted as DDMMYYYY
 */
export const formatDateForLoanNumber = (dateStr) => {
  if (!isValidDateFormat(dateStr)) return '';
  
  const [year, month, day] = dateStr.split('-');
  return `${day}${month}${year}`;
};

/**
 * Generate loan number
 * @param {number} loanId - Loan ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} Generated loan number
 */
export const generateLoanNumber = (loanId, date) => {
  const dateStr = formatDateForLoanNumber(date);
  const idStr = String(loanId).padStart(2, '0');
  return `${idStr}-${dateStr}`;
};

/**
 * Compare dates for sorting
 * @param {string} date1 - First date
 * @param {string} date2 - Second date
 * @returns {number} -1 if date1 < date2, 1 if date1 > date2, 0 if equal
 */
export const compareDates = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) return 0;
  
  if (d1.getTime() < d2.getTime()) return -1;
  if (d1.getTime() > d2.getTime()) return 1;
  return 0;
};