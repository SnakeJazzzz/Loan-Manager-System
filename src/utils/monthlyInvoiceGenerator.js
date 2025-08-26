// src/utils/monthlyInvoiceGenerator.js
import { calculateMonthlyInterest, calculateAllHistoricalInterest } from './monthlyInterestCalculator';
import { MonthlyInvoice } from '../models/MonthlyInvoice';

/**
 * Generate or regenerate a monthly invoice for a specific month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @param {Object} db - Database connection
 * @returns {Object} Generated/updated monthly invoice
 */
export const generateMonthlyInvoice = async (month, year, loans, payments, db) => {
  try {
    // Calculate interest for the month
    const monthlyCalculation = calculateMonthlyInterest(month, year, loans, payments);
    
    // Check if invoice already exists
    const existingInvoice = await db.getMonthlyInvoice(month, year);
    
    // Create or update invoice
    let invoice;
    if (existingInvoice) {
      // Update existing invoice
      invoice = new MonthlyInvoice(existingInvoice);
      invoice.update({
        totalAccrued: monthlyCalculation.totalAccrued,
        totalPaid: monthlyCalculation.totalPaid,
        remaining: monthlyCalculation.totalAccrued - monthlyCalculation.totalPaid,
        loanDetails: monthlyCalculation.loanBreakdown.map(loan => ({
          loanId: loan.loanId,
          loanNumber: loan.loanNumber,
          debtorName: loan.debtorName,
          totalInterest: loan.totalInterest,
          daysActive: loan.daysActive,
          averageBalance: loan.averageBalance,
          interestRate: loan.interestRate
        })),
        dailyBreakdown: monthlyCalculation.dailyBreakdown,
        paymentsInMonth: monthlyCalculation.paymentsInMonth
      });
      
      console.log(`Updated invoice for ${month}/${year}:`, invoice.id);
    } else {
      // Create new invoice
      invoice = MonthlyInvoice.fromCalculation(monthlyCalculation);
      invoice.generatedDate = new Date().toISOString().split('T')[0];
      
      console.log(`Created new invoice for ${month}/${year}:`, invoice.id);
    }
    
    // Save to database
    await db.saveMonthlyInvoice(invoice.toJSON());
    
    return invoice;
  } catch (error) {
    console.error(`Error generating invoice for ${month}/${year}:`, error);
    throw error;
  }
};

/**
 * Generate invoices for a range of months
 * @param {number} startMonth - Starting month
 * @param {number} startYear - Starting year
 * @param {number} endMonth - Ending month
 * @param {number} endYear - Ending year
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @param {Object} db - Database connection
 * @returns {Array} Generated invoices
 */
export const generateInvoiceRange = async (
  startMonth, 
  startYear, 
  endMonth, 
  endYear, 
  loans, 
  payments, 
  db
) => {
  const invoices = [];
  
  let currentMonth = startMonth;
  let currentYear = startYear;
  
  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    try {
      const invoice = await generateMonthlyInvoice(currentMonth, currentYear, loans, payments, db);
      invoices.push(invoice);
    } catch (error) {
      console.error(`Failed to generate invoice for ${currentMonth}/${currentYear}:`, error);
    }
    
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
  
  return invoices;
};

/**
 * Generate all historical invoices from first loan to current date
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @param {Object} db - Database connection
 * @param {boolean} forceRegenerate - Force regeneration even if exists
 * @returns {Array} Generated invoices
 */
export const generateAllHistoricalInvoices = async (loans, payments, db, forceRegenerate = false) => {
  if (!loans || loans.length === 0) {
    console.log('No loans found, skipping invoice generation');
    return [];
  }
  
  // Find earliest loan
  const earliestLoan = loans.reduce((earliest, loan) => 
    !earliest || loan.startDate < earliest.startDate ? loan : earliest,
    null
  );
  
  if (!earliestLoan) return [];
  
  const [startYear, startMonthStr] = earliestLoan.startDate.split('-');
  const startMonth = parseInt(startMonthStr);
  
  // Current date
  const now = new Date();
  const currentDay = now.getDate();
  let endMonth = now.getMonth() + 1; // Current month (1-12)
  let endYear = now.getFullYear();
  
  // FIX: Only generate up to LAST month unless it's the 1st of the month
  // If it's not the 1st of the month, don't generate current month's invoice
  if (currentDay > 1) {
    // Go back to previous month
    endMonth = endMonth - 1;
    if (endMonth === 0) {
      endMonth = 12;
      endYear = endYear - 1;
    }
  }
  
  console.log(`Checking invoices from ${startMonth}/${startYear} to ${endMonth}/${endYear} (Today: ${now.toISOString().split('T')[0]})`);
  
  const invoices = [];
  let currentMonth = startMonth;
  let currentYear = parseInt(startYear);
  let newInvoicesCount = 0;
  let skippedCount = 0;
  
  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    try {
      // Check if invoice exists
      const existing = await db.getMonthlyInvoice(currentMonth, currentYear);
      
      if (existing && !forceRegenerate) {
        skippedCount++;
        invoices.push(new MonthlyInvoice(existing));
      } else {
        const invoice = await generateMonthlyInvoice(currentMonth, currentYear, loans, payments, db);
        invoices.push(invoice);
        newInvoicesCount++;
      }
      
    } catch (error) {
      console.error(`Failed to process invoice for ${currentMonth}/${currentYear}:`, error);
    }
    
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
  
  console.log(`Invoice generation complete: ${newInvoicesCount} new, ${skippedCount} existing`);
  return invoices.filter(inv => inv !== null); // Return only successfully created invoices
};

/**
 * Regenerate invoices affected by a change
 * Called when a loan or payment is added/modified/deleted
 * @param {string} changeDate - Date of the change (YYYY-MM-DD)
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @param {Object} db - Database connection
 * @returns {Array} Regenerated invoices
 */
export const regenerateAffectedInvoices = async (changeDate, loans, payments, db) => {
  if (!changeDate) {
    console.error('No change date provided');
    return [];
  }
  
  const [year, monthStr] = changeDate.split('-');
  const month = parseInt(monthStr);
  
  // Regenerate from the month of change to last completed month
  const now = new Date();
  const currentDay = now.getDate();
  let endMonth = now.getMonth() + 1;
  let endYear = now.getFullYear();
  
  // FIX: Don't regenerate current month unless it's complete
  if (currentDay > 1) {
    endMonth = endMonth - 1;
    if (endMonth === 0) {
      endMonth = 12;
      endYear = endYear - 1;
    }
  }
  
  console.log(`Regenerating invoices from ${month}/${year} to ${endMonth}/${endYear} due to change on ${changeDate}`);
  
  return await generateInvoiceRange(
    month,
    parseInt(year),
    endMonth,
    endYear,
    loans,
    payments,
    db
  );
};

/**
 * Check and generate invoice for current month if missing
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @param {Object} db - Database connection
 * @returns {Object|null} Generated invoice or null if already exists
 */
export const checkAndGenerateCurrentMonth = async (loans, payments, db) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Check if invoice already exists
  const existing = await db.getMonthlyInvoice(currentMonth, currentYear);
  if (existing) {
    console.log(`Invoice for current month (${currentMonth}/${currentYear}) already exists`);
    return null;
  }
  
  // Generate if missing
  console.log(`Generating invoice for current month (${currentMonth}/${currentYear})`);
  return await generateMonthlyInvoice(currentMonth, currentYear, loans, payments, db);
};

/**
 * Check and generate invoice for previous months if we're past the 1st
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @param {Object} db - Database connection
 * @returns {Object|null} Generated invoice or null
 */
export const checkAndGeneratePreviousMonth = async (loans, payments, db) => {
  const now = new Date();
  const currentDay = now.getDate();
  
  // Only generate previous month's invoice if we're past the 1st of current month
  if (currentDay < 2) {
    return null;
  }
  
  // Calculate previous month
  let prevMonth = now.getMonth(); // 0-11, so this is actually last month for getMonth() + 1
  let prevYear = now.getFullYear();
  
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear--;
  }
  
  // Check if invoice already exists
  const existing = await db.getMonthlyInvoice(prevMonth, prevYear);
  if (existing) {
    console.log(`Invoice for previous month (${prevMonth}/${prevYear}) already exists`);
    return null;
  }
  
  // Generate if missing
  console.log(`Generating invoice for previous month (${prevMonth}/${prevYear})`);
  return await generateMonthlyInvoice(prevMonth, prevYear, loans, payments, db);
};

/**
 * Get invoice generation status for all months with loans
 * @param {Array} loans - All loans
 * @param {Object} db - Database connection
 * @returns {Object} Status report
 */
export const getInvoiceGenerationStatus = async (loans, db) => {
  if (!loans || loans.length === 0) {
    return {
      totalMonths: 0,
      generatedCount: 0,
      missingCount: 0,
      missingMonths: []
    };
  }
  
  // Find earliest loan
  const earliestLoan = loans.reduce((earliest, loan) => 
    !earliest || loan.startDate < earliest.startDate ? loan : earliest,
    null
  );
  
  const [startYear, startMonthStr] = earliestLoan.startDate.split('-');
  const startMonth = parseInt(startMonthStr);
  
  // Current date
  const now = new Date();
  const currentDay = now.getDate();
  let endMonth = now.getMonth() + 1;
  let endYear = now.getFullYear();
  
  // Only count completed months
  if (currentDay > 1) {
    endMonth = endMonth - 1;
    if (endMonth === 0) {
      endMonth = 12;
      endYear = endYear - 1;
    }
  }
  
  const missingMonths = [];
  let totalMonths = 0;
  let generatedCount = 0;
  
  let currentMonth = startMonth;
  let currentYear = parseInt(startYear);
  
  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    totalMonths++;
    
    const existing = await db.getMonthlyInvoice(currentMonth, currentYear);
    if (existing) {
      generatedCount++;
    } else {
      missingMonths.push({
        month: currentMonth,
        year: currentYear,
        display: `${currentMonth}/${currentYear}`
      });
    }
    
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
  
  return {
    totalMonths,
    generatedCount,
    missingCount: totalMonths - generatedCount,
    missingMonths,
    percentageComplete: totalMonths > 0 ? (generatedCount / totalMonths * 100).toFixed(1) : 0
  };
};

/**
 * Validate invoice totals match calculations
 * Useful for debugging
 * @param {Object} invoice - Monthly invoice
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @returns {Object} Validation result
 */
export const validateInvoice = async (invoice, loans, payments) => {
  const recalculated = calculateMonthlyInterest(invoice.month, invoice.year, loans, payments);
  
  const differences = {
    totalAccrued: Math.abs(invoice.totalAccrued - recalculated.totalAccrued),
    totalPaid: Math.abs(invoice.totalPaid - recalculated.totalPaid),
    remaining: Math.abs(invoice.remaining - (recalculated.totalAccrued - recalculated.totalPaid))
  };
  
  const isValid = 
    differences.totalAccrued < 0.01 &&
    differences.totalPaid < 0.01 &&
    differences.remaining < 0.01;
  
  return {
    isValid,
    invoice: {
      totalAccrued: invoice.totalAccrued,
      totalPaid: invoice.totalPaid,
      remaining: invoice.remaining
    },
    calculated: {
      totalAccrued: recalculated.totalAccrued,
      totalPaid: recalculated.totalPaid,
      remaining: recalculated.totalAccrued - recalculated.totalPaid
    },
    differences
  };
};

export default {
  generateMonthlyInvoice,
  generateInvoiceRange,
  generateAllHistoricalInvoices,
  regenerateAffectedInvoices,
  checkAndGenerateCurrentMonth,
  checkAndGeneratePreviousMonth,
  getInvoiceGenerationStatus,
  validateInvoice
};