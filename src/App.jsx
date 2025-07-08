// src/App.jsx
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import LoansList from './pages/LoansList';
import InvoicesList from './pages/InvoicesList';
import LoanForm from './components/LoanForm';
import PaymentForm from './components/PaymentForm';
import LoanDetails from './components/LoanDetails';
import { calculateInterest, daysBetween } from './utils/loanCalculations';

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

  // Loan management functions
  const createLoan = (loanData) => {
    const newLoan = {
      id: Date.now(),
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

  // Payment processing
  const processPayment = (paymentData) => {
    const loan = loans.find(l => l.id === paymentData.loanId);
    if (!loan) return;

    let remainingPayment = paymentData.amount;
    let interestPaid = 0;
    let principalPaid = 0;

    // First, pay off accrued interest
    if (loan.accruedInterest > 0) {
      if (remainingPayment >= loan.accruedInterest) {
        interestPaid = loan.accruedInterest;
        remainingPayment -= loan.accruedInterest;
        
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
      id: Date.now(),
      ...paymentData,
      interestPaid,
      principalPaid,
      totalPaid: paymentData.amount
    };
    setPayments([...payments, payment]);

    // Update loan
    const newRemainingPrincipal = loan.remainingPrincipal - principalPaid;
    const newAccruedInterest = loan.accruedInterest - interestPaid;
    
    updateLoan(loan.id, {
      remainingPrincipal: newRemainingPrincipal,
      accruedInterest: newAccruedInterest,
      status: newRemainingPrincipal <= 0 ? 'Paid' : 'Open'
    });

    setShowPaymentForm(false);
    alert('Pago registrado exitosamente');
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
            onViewLoan={setSelectedLoan}
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
      {showLoanForm && (
        <LoanForm 
          onSubmit={createLoan}
          onCancel={() => setShowLoanForm(false)}
        />
      )}
      {showPaymentForm && (
        <PaymentForm 
          loans={loans}
          onSubmit={processPayment}
          onCancel={() => setShowPaymentForm(false)}
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