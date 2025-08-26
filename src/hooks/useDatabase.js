import { useState, useEffect } from 'react';

const useDatabase = () => {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(window.electronAPI !== undefined);
  }, []);

  const db = {
    // ========== LOANS ==========
    getLoans: async () => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.getLoans();
        } catch (error) {
          console.error('Error getting loans from database:', error);
          return [];
        }
      } else {
        // Fallback to localStorage for development in browser
        const data = localStorage.getItem('loans');
        return data ? JSON.parse(data) : [];
      }
    },
    
    saveLoan: async (loan) => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.createLoan(loan);
        } catch (error) {
          console.error('Error saving loan to database:', error);
          throw error;
        }
      } else {
        // Fallback to localStorage
        const loans = JSON.parse(localStorage.getItem('loans') || '[]');
        loans.push(loan);
        localStorage.setItem('loans', JSON.stringify(loans));
        return { success: true };
      }
    },
    
    updateLoan: async (id, updates) => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.updateLoan(id, updates);
        } catch (error) {
          console.error('Error updating loan in database:', error);
          throw error;
        }
      } else {
        // Fallback to localStorage
        const loans = JSON.parse(localStorage.getItem('loans') || '[]');
        const index = loans.findIndex(l => l.id === id);
        if (index !== -1) {
          loans[index] = { ...loans[index], ...updates };
          localStorage.setItem('loans', JSON.stringify(loans));
        }
        return { success: true };
      }
    },
    
    deleteLoan: async (id) => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.deleteLoan(id);
        } catch (error) {
          console.error('Error deleting loan from database:', error);
          throw error;
        }
      } else {
        // Fallback to localStorage
        const loans = JSON.parse(localStorage.getItem('loans') || '[]');
        localStorage.setItem('loans', JSON.stringify(loans.filter(l => l.id !== id)));
        return { success: true };
      }
    },

    // ========== PAYMENTS ==========
    getPayments: async () => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.getPayments();
        } catch (error) {
          console.error('Error getting payments from database:', error);
          return [];
        }
      } else {
        const data = localStorage.getItem('payments');
        return data ? JSON.parse(data) : [];
      }
    },
    
    savePayment: async (payment) => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.createPayment(payment);
        } catch (error) {
          console.error('Error saving payment to database:', error);
          throw error;
        }
      } else {
        const payments = JSON.parse(localStorage.getItem('payments') || '[]');
        payments.push(payment);
        localStorage.setItem('payments', JSON.stringify(payments));
        return { success: true };
      }
    },
    
    deletePayment: async (id) => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.deletePayment(id);
        } catch (error) {
          console.error('Error deleting payment from database:', error);
          throw error;
        }
      } else {
        const payments = JSON.parse(localStorage.getItem('payments') || '[]');
        localStorage.setItem('payments', JSON.stringify(payments.filter(p => p.id !== id)));
        return { success: true };
      }
    },

    // ========== INTEREST PAYMENTS ==========
    getInterestPayments: async () => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.getInterestPayments();
        } catch (error) {
          console.error('Error getting interest payments from database:', error);
          return [];
        }
      } else {
        const data = localStorage.getItem('interestPayments');
        return data ? JSON.parse(data) : [];
      }
    },
    
    saveInterestPayment: async (interestPayment) => {
      if (isElectron && window.electronAPI) {
        try {
          const result = await window.electronAPI.createInterestPayment(interestPayment);
          // Update interestPayment with auto-generated ID from database
          return { ...interestPayment, id: result.id };
        } catch (error) {
          console.error('Error saving interest payment to database:', error);
          throw error;
        }
      } else {
        const interestPayments = JSON.parse(localStorage.getItem('interestPayments') || '[]');
        interestPayments.push(interestPayment);
        localStorage.setItem('interestPayments', JSON.stringify(interestPayments));
        return interestPayment;
      }
    },

    // ========== INTEREST EVENTS ==========
    getInterestEvents: async () => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.getInterestEvents();
        } catch (error) {
          console.error('Error getting interest events from database:', error);
          return [];
        }
      } else {
        const data = localStorage.getItem('interestEvents');
        return data ? JSON.parse(data) : [];
      }
    },
    
    saveInterestEvent: async (event) => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.createInterestEvent(event);
        } catch (error) {
          console.error('Error saving interest event to database:', error);
          throw error;
        }
      } else {
        const events = JSON.parse(localStorage.getItem('interestEvents') || '[]');
        events.push(event);
        localStorage.setItem('interestEvents', JSON.stringify(events));
        return { success: true };
      }
    },

    // ========== ACCOUNT TRANSACTIONS ==========
    getAccountTransactions: async () => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.getAccountTransactions();
        } catch (error) {
          console.error('Error getting account transactions from database:', error);
          return [];
        }
      } else {
        const data = localStorage.getItem('accountTransactions');
        return data ? JSON.parse(data) : [];
      }
    },
    
    saveAccountTransaction: async (transaction) => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.createAccountTransaction(transaction);
        } catch (error) {
          console.error('Error saving account transaction to database:', error);
          throw error;
        }
      } else {
        const transactions = JSON.parse(localStorage.getItem('accountTransactions') || '[]');
        transactions.push(transaction);
        localStorage.setItem('accountTransactions', JSON.stringify(transactions));
        return { success: true };
      }
    },

    // ========== BULK OPERATIONS ==========
    saveAll: async (loans, payments, invoices, interestEvents) => {
      if (isElectron && window.electronAPI) {
        // In Electron, data is already saved individually
        return { success: true };
      } else {
        // For localStorage, save all at once
        localStorage.setItem('loans', JSON.stringify(loans));
        localStorage.setItem('payments', JSON.stringify(payments));
        localStorage.setItem('invoices', JSON.stringify(invoices));
        localStorage.setItem('interestEvents', JSON.stringify(interestEvents));
        return { success: true };
      }
    },


 
    // ========== MONTHLY INVOICES ==========
    getMonthlyInvoices: async () => {
  if (isElectron && window.electronAPI) {
    try {
      return await window.electronAPI.getMonthlyInvoices();
    } catch (error) {
      console.error('Error getting monthly invoices from database:', error);
      return [];
    }
  } else {
    const data = localStorage.getItem('monthlyInvoices');
    return data ? JSON.parse(data) : [];
  }
    },

    getMonthlyInvoice: async (month, year) => {
  if (isElectron && window.electronAPI) {
    try {
      return await window.electronAPI.getMonthlyInvoice(month, year);
    } catch (error) {
      console.error('Error getting monthly invoice from database:', error);
      return null;
    }
  } else {
    const invoices = JSON.parse(localStorage.getItem('monthlyInvoices') || '[]');
    return invoices.find(inv => inv.month === month && inv.year === year) || null;
  }
    },

    saveMonthlyInvoice: async (invoice) => {
  if (isElectron && window.electronAPI) {
    try {
      return await window.electronAPI.saveMonthlyInvoice(invoice);
    } catch (error) {
      console.error('Error saving monthly invoice to database:', error);
      throw error;
    }
  } else {
    const invoices = JSON.parse(localStorage.getItem('monthlyInvoices') || '[]');
    const existingIndex = invoices.findIndex(
      inv => inv.month === invoice.month && inv.year === invoice.year
    );
    
    if (existingIndex >= 0) {
      invoices[existingIndex] = invoice;
    } else {
      invoices.push(invoice);
    }
    
    localStorage.setItem('monthlyInvoices', JSON.stringify(invoices));
    return { success: true, id: invoice.id };
  }
    },

    deleteMonthlyInvoice: async (id) => {
  if (isElectron && window.electronAPI) {
    try {
      return await window.electronAPI.deleteMonthlyInvoice(id);
    } catch (error) {
      console.error('Error deleting monthly invoice from database:', error);
      throw error;
    }
  } else {
    const invoices = JSON.parse(localStorage.getItem('monthlyInvoices') || '[]');
    const filtered = invoices.filter(inv => inv.id !== id);
    localStorage.setItem('monthlyInvoices', JSON.stringify(filtered));
    return { success: true };
  }
    },  


  };

  return { isElectron, db };
};

export default useDatabase;