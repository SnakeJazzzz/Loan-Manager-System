// src/models/MonthlyInvoice.js

/**
 * Monthly Invoice Model
 * Represents a consolidated invoice for all interest accrued in a month
 */
export class MonthlyInvoice {
    constructor(data = {}) {
      // Identification
      this.id = data.id || this.generateId(data.month, data.year);
      this.month = data.month;
      this.year = data.year;
      
      // Dates
      this.generatedDate = data.generatedDate || new Date().toISOString().split('T')[0];
      this.lastUpdated = data.lastUpdated || new Date().toISOString().split('T')[0];
      
      // Financial totals
      this.totalAccrued = data.totalAccrued || 0;
      this.totalPaid = data.totalPaid || 0;
      this.remaining = data.remaining || (this.totalAccrued - this.totalPaid);
      
      // Status
      this.status = data.status || this.calculateStatus();
      
      // Details
      this.loanDetails = data.loanDetails || [];
      this.dailyBreakdown = data.dailyBreakdown || [];
      this.paymentsInMonth = data.paymentsInMonth || [];
      
      // Metadata
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = data.updatedAt || new Date().toISOString();
    }
    
    /**
     * Generate invoice ID in format INV-YYYYMM
     */
    generateId(month, year) {
      const monthStr = String(month).padStart(2, '0');
      return `INV-${year}${monthStr}`;
    }
    
    /**
     * Calculate invoice status based on payment status
     */
    calculateStatus() {
      // FIX: If there's nothing to pay (no interest generated), mark as Paid
      if (this.totalAccrued <= 0.01) {
        return 'Paid'; // Or you could use 'N/A' if you prefer
      }
      
      // If remaining is essentially zero, it's paid
      if (this.remaining <= 0.01) {
        return 'Paid';
      }
      
      // If some payment has been made
      if (this.totalPaid > 0.01) {
        return 'Partial';
      }
      
      // Otherwise it's pending
      return 'Pending';
    }
    
    /**
     * Update the invoice with new data
     */
    update(data) {
      Object.assign(this, data);
      this.lastUpdated = new Date().toISOString().split('T')[0];
      this.updatedAt = new Date().toISOString();
      this.remaining = this.totalAccrued - this.totalPaid;
      this.status = this.calculateStatus();
      return this;
    }
    
    /**
     * Add a payment to the invoice
     */
    addPayment(amount) {
      this.totalPaid += amount;
      this.remaining = this.totalAccrued - this.totalPaid;
      this.status = this.calculateStatus();
      this.lastUpdated = new Date().toISOString().split('T')[0];
      return this;
    }
    
    /**
     * Get month name in Spanish
     */
    getMonthName() {
      const date = new Date(this.year, this.month - 1);
      return date.toLocaleString('es-MX', { month: 'long' });
    }
    
    /**
     * Get formatted period string
     */
    getPeriodString() {
      return `${this.getMonthName()} ${this.year}`;
    }
    
    /**
     * Get status color for UI
     */
    getStatusColor() {
      switch (this.status) {
        case 'Paid': return 'green';
        case 'Partial': return 'yellow';
        case 'Pending': return 'red';
        default: return 'gray';
      }
    }
    
    /**
     * Validate invoice data
     */
    validate() {
      const errors = [];
      
      if (!this.month || this.month < 1 || this.month > 12) {
        errors.push('Invalid month');
      }
      
      if (!this.year || this.year < 2000 || this.year > 2100) {
        errors.push('Invalid year');
      }
      
      if (this.totalAccrued < 0) {
        errors.push('Total accrued cannot be negative');
      }
      
      if (this.totalPaid < 0) {
        errors.push('Total paid cannot be negative');
      }
      
      if (this.totalPaid > this.totalAccrued + 0.01) {
        errors.push('Total paid cannot exceed total accrued');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }
    
    /**
     * Convert to plain object for database storage
     */
    toJSON() {
      return {
        id: this.id,
        month: this.month,
        year: this.year,
        generatedDate: this.generatedDate,
        lastUpdated: this.lastUpdated,
        totalAccrued: this.totalAccrued,
        totalPaid: this.totalPaid,
        remaining: this.remaining,
        status: this.status,
        loanDetails: this.loanDetails,
        dailyBreakdown: this.dailyBreakdown,
        paymentsInMonth: this.paymentsInMonth,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
    
    /**
     * Create from calculation result
     */
    static fromCalculation(calculationResult) {
      return new MonthlyInvoice({
        month: calculationResult.month,
        year: calculationResult.year,
        totalAccrued: calculationResult.totalAccrued,
        totalPaid: calculationResult.totalPaid,
        remaining: calculationResult.remaining,
        loanDetails: calculationResult.loanBreakdown.map(loan => ({
          loanId: loan.loanId,
          loanNumber: loan.loanNumber,
          debtorName: loan.debtorName,
          totalInterest: loan.totalInterest,
          daysActive: loan.daysActive,
          averageBalance: loan.averageBalance
        })),
        dailyBreakdown: calculationResult.dailyBreakdown,
        paymentsInMonth: calculationResult.paymentsInMonth
      });
    }
  }
  
  /**
   * Helper functions for monthly invoices
   */
  export const MonthlyInvoiceHelpers = {
    /**
     * Check if invoice exists for a given month
     */
    exists: async (month, year, db) => {
      const invoice = await db.getMonthlyInvoice(month, year);
      return invoice !== null;
    },
    
    /**
     * Get all invoices for a year
     */
    getYearInvoices: async (year, db) => {
      const allInvoices = await db.getMonthlyInvoices();
      return allInvoices.filter(inv => inv.year === year);
    },
    
    /**
     * Get unpaid invoices
     */
    getUnpaidInvoices: async (db) => {
      const allInvoices = await db.getMonthlyInvoices();
      return allInvoices.filter(inv => inv.status !== 'Paid');
    },
    
    /**
     * Calculate total debt from all invoices
     */
    getTotalDebt: async (db) => {
      const unpaid = await MonthlyInvoiceHelpers.getUnpaidInvoices(db);
      return unpaid.reduce((sum, inv) => sum + inv.remaining, 0);
    }
  };
  
  export default MonthlyInvoice;