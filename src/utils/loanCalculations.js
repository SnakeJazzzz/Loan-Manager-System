// src/utils/loanCalculations.js

export const calculateDailyRate = (annualRate) => annualRate / 365 / 100;

export const calculateInterest = (principal, rate, days) => {
  const dailyRate = calculateDailyRate(rate);
  return principal * dailyRate * days;
};

export const daysBetween = (date1, date2) => {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatCurrency = (amount) => {
  return `${amount.toFixed(2)}`;
};

export const formatDate = (date) => {
  // Fix timezone issue by treating the date as local
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};



// Función para formatear fecha para el número de préstamo
export const formatDateForLoanNumber = (dateStr) => {
  // Dividir la fecha en formato YYYY-MM-DD
  const [year, month, day] = dateStr.split('-');
  return `${day}${month}${year}`;
};

// Función para generar el número de préstamo
// Función para generar el número de préstamo
export const generateLoanNumber = (loanId, date) => {
  const dateStr = formatDateForLoanNumber(date);
  const idStr = String(loanId).padStart(2, '0');
  return `${idStr}-${dateStr}`;
};