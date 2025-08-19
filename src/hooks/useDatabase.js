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

    // ========== INVOICES ==========
    getInvoices: async () => {
      if (isElectron && window.electronAPI) {
        try {
          return await window.electronAPI.getInvoices();
        } catch (error) {
          console.error('Error getting invoices from database:', error);
          return [];
        }
      } else {
        const data = localStorage.getItem('invoices');
        return data ? JSON.parse(data) : [];
      }
    },
    
    saveInvoice: async (invoice) => {
      if (isElectron && window.electronAPI) {
        try {
          const result = await window.electronAPI.createInvoice(invoice);
          // Update invoice with auto-generated ID from database
          return { ...invoice, id: result.id };
        } catch (error) {
          console.error('Error saving invoice to database:', error);
          throw error;
        }
      } else {
        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        invoices.push(invoice);
        localStorage.setItem('invoices', JSON.stringify(invoices));
        return invoice;
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
    }
  };

  return { isElectron, db };
};

export default useDatabase;