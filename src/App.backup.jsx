// src/App.jsx
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import LoansList from './pages/LoansList';
import InvoicesList from './pages/InvoicesList';
import PaymentsList from './pages/PaymentsList';
import LoanForm from './components/LoanForm';
import PaymentForm from './components/PaymentForm';
import LoanDetails from './components/LoanDetails';
import { calculateInterest, daysBetween, formatCurrency } from './utils/loanCalculations';

function App() {
  // State management
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [interestEvents, setInterestEvents] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);

  // Add this inside your App component, right after the state declarations
useEffect(() => {
  // Test Electron connection
  if (window.electronAPI) {
    window.electronAPI.testConnection().then(result => {
      console.log('Electron connection test:', result);
    });
  }
}, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedLoans = localStorage.getItem('loans');
    const savedPayments = localStorage.getItem('payments');
    const savedInvoices = localStorage.getItem('invoices');
    const savedInterestEvents = localStorage.getItem('interestEvents');


    if (savedLoans) setLoans(JSON.parse(savedLoans));
    if (savedPayments) setPayments(JSON.parse(savedPayments));
    if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
    if (savedInterestEvents) setInterestEvents(JSON.parse(savedInterestEvents));
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('loans', JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem('payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('interestEvents', JSON.stringify(interestEvents));
  }, [interestEvents]);

  // Get next loan ID
  const getNextLoanId = () => {
    if (loans.length === 0) return 1;
    const maxId = Math.max(...loans.map(loan => loan.id));
    return maxId + 1;
  };

  // Check if a loan can accept payments
  const canAcceptPayments = (loanId) => {
    // Find all loans with lower IDs
    const lowerIdLoans = loans.filter(loan => loan.id < loanId && loan.status === 'Open');
    // Can only pay if all previous loans are paid
    return lowerIdLoans.length === 0;
  };

  // Loan management functions
  const createLoan = (loanData) => {
    const newLoan = {
      id: getNextLoanId(),
      ...loanData,
      originalPrincipal: loanData.amount,
      remainingPrincipal: loanData.amount,
      accruedInterest: 0,
      status: 'Open',
      createdAt: new Date().toISOString()
    };
    setLoans([...loans, newLoan]);
    setShowLoanForm(false);
  };

  const updateLoan = (loanId, updates) => {
    setLoans(loans.map(loan => 
      loan.id === loanId ? { ...loan, ...updates } : loan
    ));
  };

  const editLoan = (loanData) => {
    const loan = loans.find(l => l.id === editingLoan.id);
    if (!loan) return;

    // Update loan with new data
    updateLoan(loan.id, {
      debtorName: loanData.debtorName,
      interestRate: loanData.interestRate,
      startDate: loanData.startDate,
      // Recalculate if amount changed
      originalPrincipal: loanData.amount,
      remainingPrincipal: loan.remainingPrincipal + (loanData.amount - loan.originalPrincipal)
    });
    
    setEditingLoan(null);
    alert('Préstamo actualizado exitosamente');
  };

  const deleteLoan = (loanId) => {
    if (window.confirm('¿Estás seguro de eliminar este préstamo?')) {
      setLoans(loans.filter(loan => loan.id !== loanId));
      setPayments(payments.filter(payment => payment.loanId !== loanId));
      setInvoices(invoices.filter(invoice => invoice.loanId !== loanId));
      setInterestEvents(interestEvents.filter(event => event.loanId !== loanId));
    }
  };

  // Interest calculation
  const accrueInterestForAllLoans = () => {
    const today = new Date().toISOString().split('T')[0];
    const newInterestEvents = [];
    
    const updatedLoans = loans.map(loan => {
      if (loan.status === 'Open') {
        const lastAccrualDate = loan.lastInterestAccrual || loan.startDate;
        const days = daysBetween(lastAccrualDate, today);
        
        if (days > 0) {
          const interest = calculateInterest(loan.remainingPrincipal, loan.interestRate, days);
          
          // Create interest event
          const interestEvent = {
            id: Date.now() + Math.random(),
            loanId: loan.id,
            date: today,
            amount: interest,
            days: days,
            principal: loan.remainingPrincipal
          };
          
          newInterestEvents.push(interestEvent);
          
          // Update loan
          return {
            ...loan,
            accruedInterest: (loan.accruedInterest || 0) + interest,
            lastInterestAccrual: today
          };
        }
      }
      return loan;
    });

    setLoans(updatedLoans);
    setInterestEvents([...interestEvents, ...newInterestEvents]);
    
    if (newInterestEvents.length > 0) {
      alert(`Se calcularon intereses para ${newInterestEvents.length} préstamo(s)`);
    } else {
      alert('No hay intereses nuevos para calcular');
    }
  };

  // Delete payment and recalculate loan
  const deletePayment = (paymentId) => {
    if (!window.confirm('¿Estás seguro de eliminar este pago? Los montos se revertirán al préstamo.')) {
      return;
    }

    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    // Revert the payment on the loan
    const loan = loans.find(l => l.id === payment.loanId);
    if (loan) {
      updateLoan(loan.id, {
        remainingPrincipal: loan.remainingPrincipal + payment.principalPaid,
        accruedInterest: (loan.accruedInterest || 0) + payment.interestPaid,
        status: 'Open' // Reopen the loan if it was paid
      });

      // Remove related invoices
      setInvoices(invoices.filter(invoice => 
        !(invoice.loanId === payment.loanId && invoice.date === payment.date)
      ));
    }

    // Remove the payment
    setPayments(payments.filter(p => p.id !== paymentId));
    alert('Pago eliminado y montos revertidos al préstamo');
  };

  // Payment processing
  const processPayment = (paymentData) => {
    const loan = loans.find(l => l.id === paymentData.loanId);
    if (!loan) return;

    // First, calculate interest up to payment date
    const lastAccrualDate = loan.lastInterestAccrual || loan.startDate;
    const days = daysBetween(lastAccrualDate, paymentData.date);
    
    let currentAccruedInterest = loan.accruedInterest || 0;
    let interestCalculated = 0;
    
    if (days > 0 && loan.remainingPrincipal > 0) {
      interestCalculated = calculateInterest(loan.remainingPrincipal, loan.interestRate, days);
      currentAccruedInterest += interestCalculated;
      
      // Create interest event
      const interestEvent = {
        id: Date.now() + Math.random(),
        loanId: loan.id,
        date: paymentData.date,
        amount: interestCalculated,
        days: days,
        principal: loan.remainingPrincipal
      };
      setInterestEvents([...interestEvents, interestEvent]);
    }

    // Generate sequential payment ID
    const paymentId = payments.length > 0 
      ? Math.max(...payments.map(p => p.id)) + 1 
      : 1;

    let remainingPayment = paymentData.amount;
    let interestPaid = 0;
    let principalPaid = 0;

    // First, pay off accrued interest
    if (currentAccruedInterest > 0) {
      if (remainingPayment >= currentAccruedInterest) {
        interestPaid = currentAccruedInterest;
        remainingPayment -= currentAccruedInterest;
        
        // Generate invoice for interest paid
        const invoice = {
          id: Date.now(),
          loanId: loan.id,
          date: paymentData.date,
          amount: interestPaid,
          description: `Pago de intereses - Préstamo #${loan.id}`,
          type: 'interest'
        };
        setInvoices([...invoices, invoice]);
      } else {
        interestPaid = remainingPayment;
        remainingPayment = 0;
      }
    }

    // Then, pay off principal
    if (remainingPayment > 0) {
      principalPaid = Math.min(remainingPayment, loan.remainingPrincipal);
    }

    // Create payment record
    const payment = {
      id: paymentId,
      ...paymentData,
      interestPaid,
      principalPaid,
      totalPaid: paymentData.amount
    };
    setPayments([...payments, payment]);

    // Update loan
    const newRemainingPrincipal = loan.remainingPrincipal - principalPaid;
    const newAccruedInterest = currentAccruedInterest - interestPaid;
    
    updateLoan(loan.id, {
      remainingPrincipal: newRemainingPrincipal,
      accruedInterest: newAccruedInterest,
      status: newRemainingPrincipal <= 0 ? 'Paid' : 'Open',
      lastInterestAccrual: paymentData.date
    });

    setShowPaymentForm(false);
    
    // Show detailed payment breakdown
    alert(`Pago registrado exitosamente:\n\nInterés calculado: ${formatCurrency(interestCalculated)}\nInterés pagado: ${formatCurrency(interestPaid)}\nPrincipal pagado: ${formatCurrency(principalPaid)}\n\nPrincipal restante: ${formatCurrency(newRemainingPrincipal)}\nInterés pendiente: ${formatCurrency(newAccruedInterest)}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Sistema de Gestión de Préstamos</h1>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 transition-colors ${
                activeTab === 'dashboard' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Panel de Control
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`py-4 px-1 border-b-2 transition-colors ${
                activeTab === 'loans' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Préstamos
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 transition-colors ${
                activeTab === 'payments' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pagos
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 transition-colors ${
                activeTab === 'invoices' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Facturas
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {activeTab === 'dashboard' && (
          <Dashboard 
            loans={loans}
            invoices={invoices}
            onNewLoan={() => setShowLoanForm(true)}
            onNewPayment={() => setShowPaymentForm(true)}
            onAccrueInterest={accrueInterestForAllLoans}
            onViewInvoices={() => setActiveTab('invoices')}
          />
        )}
        {activeTab === 'loans' && (
          <LoansList 
            loans={loans}
            onNewLoan={() => setShowLoanForm(true)}
            onDeleteLoan={deleteLoan}
            onEditLoan={(loan) => setEditingLoan(loan)}
            onViewLoan={setSelectedLoan}
          />
        )}
        {activeTab === 'payments' && (
          <PaymentsList 
            payments={payments}
            loans={loans}
            onDeletePayment={deletePayment}
          />
        )}
        {activeTab === 'invoices' && (
          <InvoicesList 
            invoices={invoices}
            loans={loans}
          />
        )}
      </main>

      {/* Forms and Modals */}
      {(showLoanForm || editingLoan) && (
        <LoanForm 
          onSubmit={editingLoan ? editLoan : createLoan}
          onCancel={() => {
            setShowLoanForm(false);
            setEditingLoan(null);
          }}
          initialData={editingLoan}
        />
      )}
      {showPaymentForm && (
        <PaymentForm 
          loans={loans}
          onSubmit={processPayment}
          onCancel={() => setShowPaymentForm(false)}
          canAcceptPayments={canAcceptPayments}
        />
      )}
      {selectedLoan && (
        <LoanDetails 
          loan={selectedLoan}
          payments={payments}
          invoices={invoices}
          interestEvents={interestEvents}
          onClose={() => setSelectedLoan(null)}
        />
      )}
    </div>
  );
}

export default App;