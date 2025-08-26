const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Test
  testConnection: () => ipcRenderer.invoke('test-connection'),
  
  // Loans
  getLoans: () => ipcRenderer.invoke('db:getLoans'),
  createLoan: (loan) => ipcRenderer.invoke('db:createLoan', loan),
  updateLoan: (id, updates) => ipcRenderer.invoke('db:updateLoan', id, updates),
  deleteLoan: (id) => ipcRenderer.invoke('db:deleteLoan', id),
  
  // Payments
  getPayments: () => ipcRenderer.invoke('db:getPayments'),
  createPayment: (payment) => ipcRenderer.invoke('db:createPayment', payment),
  deletePayment: (id) => ipcRenderer.invoke('db:deletePayment', id),
  
  // Interest Payments
  getInterestPayments: () => ipcRenderer.invoke('db:getInterestPayments'),
  createInterestPayment: (payment) => ipcRenderer.invoke('db:createInterestPayment', payment),
  
  // Interest Events
  getInterestEvents: () => ipcRenderer.invoke('db:getInterestEvents'),
  createInterestEvent: (event) => ipcRenderer.invoke('db:createInterestEvent', event),
  
  // Account Transactions
  getAccountTransactions: () => ipcRenderer.invoke('db:getAccountTransactions'),
  createAccountTransaction: (transaction) => ipcRenderer.invoke('db:createAccountTransaction', transaction),

  // Add these monthly invoice methods
  getMonthlyInvoices: () => ipcRenderer.invoke('db:getMonthlyInvoices'),
  getMonthlyInvoice: (month, year) => ipcRenderer.invoke('db:getMonthlyInvoice', month, year),
  saveMonthlyInvoice: (invoice) => ipcRenderer.invoke('db:saveMonthlyInvoice', invoice),
  deleteMonthlyInvoice: (id) => ipcRenderer.invoke('db:deleteMonthlyInvoice', id),
});