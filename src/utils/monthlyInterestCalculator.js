// src/utils/monthlyInterestCalculator.js
import { calculateInterest, daysBetween } from './loanCalculations';

/**
 * Calculate monthly interest for a specific month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @returns {Object} Monthly calculation result
 */
export const calculateMonthlyInterest = (month, year, loans, payments) => {
  const monthStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0];
  
  // Get all loans that were active during this month
  const activeLoans = loans.filter(loan => {
    const loanStart = loan.startDate;
    // Loan is active if it started before or during the month
    return loanStart <= monthEnd;
  });
  
  // Get payments made during this month
  const paymentsInMonth = payments.filter(payment => 
    payment.date >= monthStart && payment.date <= monthEnd
  );
  
  let totalAccrued = 0;
  let totalPaid = 0;
  const loanBreakdown = [];
  const dailyBreakdown = [];
  
  // Calculate interest for each active loan
  for (const loan of activeLoans) {
    const loanPayments = payments.filter(p => p.loanId === loan.id).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Find the starting balance for this month
    let startingPrincipal = loan.originalPrincipal;
    let lastCalculationDate = loan.startDate;
    
    // Apply all payments made before this month
    for (const payment of loanPayments) {
      if (payment.date < monthStart) {
        startingPrincipal -= payment.principalPaid;
        lastCalculationDate = payment.date;
      }
    }
    
    if (startingPrincipal <= 0) continue; // Loan was already paid off
    
    // Calculate day-by-day for this month
    let currentPrincipal = startingPrincipal;
    let monthlyInterestForLoan = 0;
    const currentDate = new Date(Math.max(new Date(lastCalculationDate), new Date(monthStart)));
    const endDate = new Date(monthEnd);
    
    while (currentDate <= endDate && currentPrincipal > 0) {
      const dayStr = currentDate.toISOString().split('T')[0];
      
      // Check if there's a payment on this day
      const paymentOnThisDay = paymentsInMonth.find(p => p.loanId === loan.id && p.date === dayStr);
      
      if (paymentOnThisDay) {
        // Calculate interest up to this day
        if (currentPrincipal > 0) {
          const dayInterest = calculateInterest(currentPrincipal, loan.interestRate, 1);
          monthlyInterestForLoan += dayInterest;
          
          dailyBreakdown.push({
            date: dayStr,
            loanId: loan.id,
            loanNumber: loan.loanNumber,
            principal: currentPrincipal,
            dailyInterest: dayInterest,
            payment: paymentOnThisDay.totalPaid
          });
        }
        
        // Apply the payment
        currentPrincipal -= paymentOnThisDay.principalPaid;
        totalPaid += paymentOnThisDay.interestPaid;
      } else {
        // No payment, just accrue interest
        if (currentPrincipal > 0) {
          const dayInterest = calculateInterest(currentPrincipal, loan.interestRate, 1);
          monthlyInterestForLoan += dayInterest;
          
          dailyBreakdown.push({
            date: dayStr,
            loanId: loan.id,
            loanNumber: loan.loanNumber,
            principal: currentPrincipal,
            dailyInterest: dayInterest,
            payment: 0
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    totalAccrued += monthlyInterestForLoan;
    
    loanBreakdown.push({
      loanId: loan.id,
      loanNumber: loan.loanNumber,
      debtorName: loan.debtorName,
      totalInterest: monthlyInterestForLoan,
      daysActive: Math.ceil((Math.min(new Date(monthEnd), new Date()) - Math.max(new Date(monthStart), new Date(loan.startDate))) / (1000 * 60 * 60 * 24)) + 1,
      averageBalance: startingPrincipal, // Simplified - could be more accurate
      interestRate: loan.interestRate
    });
  }
  
  return {
    month,
    year,
    totalAccrued: Math.round(totalAccrued * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    loanBreakdown,
    dailyBreakdown,
    paymentsInMonth
  };
};

/**
 * Calculate all historical interest
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @returns {Object} Historical calculation result
 */
export const calculateAllHistoricalInterest = (loans, payments) => {
  if (!loans || loans.length === 0) {
    return {
      totalAccrued: 0,
      totalPaid: 0,
      breakdown: []
    };
  }
  
  // Find date range
  const earliestLoan = loans.reduce((earliest, loan) => 
    !earliest || loan.startDate < earliest.startDate ? loan : earliest,
    null
  );
  
  if (!earliestLoan) {
    return { totalAccrued: 0, totalPaid: 0, breakdown: [] };
  }
  
  const [startYear, startMonth] = earliestLoan.startDate.split('-').map(Number);
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  
  let totalAccrued = 0;
  let totalPaid = 0;
  const breakdown = [];
  
  // Calculate for each month
  let currentMonth = startMonth;
  let currentYear = startYear;
  
  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    const monthlyResult = calculateMonthlyInterest(currentMonth, currentYear, loans, payments);
    
    totalAccrued += monthlyResult.totalAccrued;
    totalPaid += monthlyResult.totalPaid;
    
    breakdown.push({
      month: currentMonth,
      year: currentYear,
      accrued: monthlyResult.totalAccrued,
      paid: monthlyResult.totalPaid,
      remaining: monthlyResult.totalAccrued - monthlyResult.totalPaid
    });
    
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
  
  return {
    totalAccrued: Math.round(totalAccrued * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    breakdown
  };
};

export default {
  calculateMonthlyInterest,
  calculateAllHistoricalInterest
};