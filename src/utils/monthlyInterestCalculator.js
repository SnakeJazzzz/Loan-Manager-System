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
    // FIX: Check if loan was active at any point during the month
    // A loan is active if it started before or during the month
    return loan.startDate <= monthEnd;
  });
  
  let totalAccrued = 0;
  let totalPaid = 0;
  const loanBreakdown = [];
  const dailyBreakdown = [];
  
  // Calculate interest for each active loan
  for (const loan of activeLoans) {
    // Get all payments for this loan, sorted by date
    const loanPayments = payments.filter(p => p.loanId === loan.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Determine the period for interest calculation in this month
    const interestStartDate = loan.startDate > monthStart ? loan.startDate : monthStart;
    const interestEndDate = monthEnd;
    
    // Skip if loan starts after month ends
    if (interestStartDate > interestEndDate) {
      continue;
    }
    
    // Find the principal balance at the start of the interest period
    let currentPrincipal = loan.originalPrincipal;
    
    // Apply all payments made before the interest calculation period
    for (const payment of loanPayments) {
      if (payment.date < interestStartDate) {
        currentPrincipal -= (payment.principalPaid || 0);
      }
    }
    
    // If loan is already paid off, skip
    if (currentPrincipal <= 0) {
      continue;
    }
    
    // Calculate interest day by day for this month
    let monthlyInterestForLoan = 0;
    let daysActive = 0;
    
    // Get payments that happened during this month
    const paymentsThisMonth = loanPayments.filter(p => 
      p.date >= monthStart && p.date <= monthEnd
    );
    
    // Calculate from start date to end date or first payment
    let calcStartDate = interestStartDate;
    
    // If there are payments this month, calculate in segments
    if (paymentsThisMonth.length > 0) {
      for (const payment of paymentsThisMonth) {
        // Calculate days from last calculation to this payment
        const daysInSegment = daysBetween(calcStartDate, payment.date);
        
        if (daysInSegment > 0 && currentPrincipal > 0) {
          const segmentInterest = calculateInterest(currentPrincipal, loan.interestRate, daysInSegment);
          monthlyInterestForLoan += segmentInterest;
          daysActive += daysInSegment;
          
          // Add daily breakdown for this segment
          for (let i = 0; i < daysInSegment; i++) {
            const segmentDate = new Date(calcStartDate);
            segmentDate.setDate(segmentDate.getDate() + i);
            const dayStr = segmentDate.toISOString().split('T')[0];
            const dayInterest = calculateInterest(currentPrincipal, loan.interestRate, 1);
            
            dailyBreakdown.push({
              date: dayStr,
              loanId: loan.id,
              loanNumber: loan.loanNumber,
              principal: currentPrincipal,
              dailyInterest: dayInterest,
              payment: dayStr === payment.date ? payment.totalPaid : 0,
              interestPaid: dayStr === payment.date ? (payment.interestPaid || 0) : 0
            });
          }
        }
        
        // Update principal after payment
        currentPrincipal -= (payment.principalPaid || 0);
        calcStartDate = payment.date;
        
        // Move to next day for calculation
        const nextDay = new Date(payment.date);
        nextDay.setDate(nextDay.getDate() + 1);
        calcStartDate = nextDay.toISOString().split('T')[0];
      }
    }
    
    // Calculate remaining days after last payment (or full month if no payments)
    if (calcStartDate <= interestEndDate && currentPrincipal > 0) {
      const remainingDays = daysBetween(calcStartDate, interestEndDate) + 1;
      
      if (remainingDays > 0) {
        const remainingInterest = calculateInterest(currentPrincipal, loan.interestRate, remainingDays);
        monthlyInterestForLoan += remainingInterest;
        daysActive += remainingDays;
        
        // Add daily breakdown for remaining days
        for (let i = 0; i < remainingDays; i++) {
          const segmentDate = new Date(calcStartDate);
          segmentDate.setDate(segmentDate.getDate() + i);
          const dayStr = segmentDate.toISOString().split('T')[0];
          
          if (dayStr <= interestEndDate) {
            const dayInterest = calculateInterest(currentPrincipal, loan.interestRate, 1);
            
            dailyBreakdown.push({
              date: dayStr,
              loanId: loan.id,
              loanNumber: loan.loanNumber,
              principal: currentPrincipal,
              dailyInterest: dayInterest,
              payment: 0,
              interestPaid: 0
            });
          }
        }
      }
    }
    
    totalAccrued += monthlyInterestForLoan;
    
    if (monthlyInterestForLoan > 0 || paymentsThisMonth.length > 0) {
      loanBreakdown.push({
        loanId: loan.id,
        loanNumber: loan.loanNumber || `#${loan.id}`,
        debtorName: loan.debtorName,
        totalInterest: monthlyInterestForLoan,
        daysActive: daysActive,
        averageBalance: currentPrincipal,
        interestRate: loan.interestRate
      });
    }
  }
  
  // Get all payments in this month to track interest paid
  const allPaymentsThisMonth = payments.filter(p => 
    p.date >= monthStart && p.date <= monthEnd
  );
  
  // Sum up all interest paid in this month
  totalPaid = allPaymentsThisMonth.reduce((sum, p) => sum + (p.interestPaid || 0), 0);
  
  // Calculate remaining (unpaid interest)
  const remaining = totalAccrued - totalPaid;
  
  return {
    month,
    year,
    totalAccrued: Math.round(totalAccrued * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
    loanBreakdown,
    dailyBreakdown,
    paymentsInMonth: allPaymentsThisMonth
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