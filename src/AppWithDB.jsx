// src/AppWithDB.jsx
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import LoansList from './pages/LoansList';
import InvoicesList from './pages/InvoicesList';
import PaymentsList from './pages/PaymentsList';
import LoanForm from './components/LoanForm';
import PaymentForm from './components/PaymentForm';
import LoanDetails from './components/LoanDetails';
//import { calculateInterest, daysBetween, formatCurrency } from './utils/loanCalculations';
import { calculateInterest, daysBetween, formatCurrency, generateLoanNumber } from './utils/loanCalculations';
import useDatabase from './hooks/useDatabase';

function AppWithDB() {
  // Database hook
  const { isElectron, db } = useDatabase();
  
  // State management
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [interestEvents, setInterestEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);

  // Load data from database on mount
  useEffect(() => {
    loadAllData();
  }, [isElectron]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [loansData, paymentsData, invoicesData, eventsData] = await Promise.all([
        db.getLoans(),
        db.getPayments(),
        db.getInvoices(),
        db.getInterestEvents()
      ]);
      
      setLoans(loansData);
      setPayments(paymentsData);
      setInvoices(invoicesData);
      setInterestEvents(eventsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get next loan ID
  const getNextLoanId = () => {
    if (loans.length === 0) return 1;
    const maxId = Math.max(...loans.map(loan => loan.id));
    return maxId + 1;
  };

  // Check if a loan can accept payments
  const canAcceptPayments = (loanId) => {
    const lowerIdLoans = loans.filter(loan => loan.id < loanId && loan.status === 'Open');
    return lowerIdLoans.length === 0;
  };

  // Loan management functions
  const createLoan = async (loanData) => {
    // Usar el ID del preview si está disponible, sino generar uno nuevo
    const loanId = loanData.previewId || getNextLoanId();
    
    // Regenerar el loanNumber con el ID final para asegurar consistencia
    const loanNumber = generateLoanNumber(loanId, loanData.startDate);
    
    const newLoan = {
      id: loanId,
      ...loanData,
      originalPrincipal: loanData.amount,
      remainingPrincipal: loanData.amount,
      accruedInterest: 0,
      status: 'Open',
      createdAt: new Date().toISOString(),
      destiny: loanData.destiny || '',
      loanNumber: loanNumber
    };
    
    try {
      await db.saveLoan(newLoan);
      setLoans([...loans, newLoan]);
      setShowLoanForm(false);
      alert('Préstamo creado exitosamente');
    } catch (error) {
      alert('Error al crear el préstamo: ' + error.message);
    }
  };


  const editLoan = async (loanData) => {
    const loan = loans.find(l => l.id === editingLoan.id);
    if (!loan) return;
  
    try {
      await db.updateLoan(loan.id, {
        debtorName: loanData.debtorName,
        interestRate: loanData.interestRate,
        startDate: loanData.startDate,
        destiny: loanData.destiny || '',
        originalPrincipal: loanData.amount,
        remainingPrincipal: loan.remainingPrincipal + (loanData.amount - loan.originalPrincipal)
      });
      
      await loadAllData();
      setEditingLoan(null);
      alert('Préstamo actualizado exitosamente');
    } catch (error) {
      alert('Error al actualizar el préstamo: ' + error.message);
    }
  };

  const deleteLoan = async (loanId) => {
    if (window.confirm('¿Estás seguro de eliminar este préstamo?')) {
      try {
        await db.deleteLoan(loanId);
        setLoans(loans.filter(loan => loan.id !== loanId));
        setPayments(payments.filter(payment => payment.loanId !== loanId));
        setInvoices(invoices.filter(invoice => invoice.loanId !== loanId));
        setInterestEvents(interestEvents.filter(event => event.loanId !== loanId));
        alert('Préstamo eliminado exitosamente');
      } catch (error) {
        alert('Error al eliminar el préstamo: ' + error.message);
      }
    }
  };

  // Interest calculation
  const accrueInterestForAllLoans = async () => {
    const today = new Date().toISOString().split('T')[0];
    const newInterestEvents = [];
    const loansToUpdate = [];
    
    for (const loan of loans) {
      if (loan.status === 'Open') {
        const lastAccrualDate = loan.lastInterestAccrual || loan.startDate;
        const days = daysBetween(lastAccrualDate, today);
        
        if (days > 0) {
          const interest = calculateInterest(loan.remainingPrincipal, loan.interestRate, days);
          
          const interestEvent = {
            id: `${Date.now()}-${Math.random()}`,
            loanId: loan.id,
            date: today,
            amount: interest,
            days: days,
            principal: loan.remainingPrincipal
          };
          
          newInterestEvents.push(interestEvent);
          loansToUpdate.push({
            id: loan.id,
            accruedInterest: (loan.accruedInterest || 0) + interest,
            lastInterestAccrual: today
          });
        }
      }
    }

    if (newInterestEvents.length > 0) {
      try {
        // Save all interest events
        for (const event of newInterestEvents) {
          await db.saveInterestEvent(event);
        }
        
        // Update all loans
        for (const update of loansToUpdate) {
          await db.updateLoan(update.id, {
            accruedInterest: update.accruedInterest,
            lastInterestAccrual: update.lastInterestAccrual
          });
        }
        
        // Reload data to ensure consistency
        await loadAllData();
        alert(`Se calcularon intereses para ${newInterestEvents.length} préstamo(s)`);
      } catch (error) {
        alert('Error al calcular intereses: ' + error.message);
      }
    } else {
      alert('No hay intereses nuevos para calcular');
    }
  };

  // Delete payment and recalculate loan
  const deletePayment = async (paymentId) => {
    if (!window.confirm('¿Estás seguro de eliminar este pago? Los montos se revertirán al préstamo.')) {
      return;
    }

    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    const loan = loans.find(l => l.id === payment.loanId);
    if (loan) {
      try {
        // Update loan
        await db.updateLoan(loan.id, {
          remainingPrincipal: loan.remainingPrincipal + payment.principalPaid,
          accruedInterest: (loan.accruedInterest || 0) + payment.interestPaid,
          status: 'Open'
        });

        // Delete payment
        await db.deletePayment(paymentId);

        // Reload data
        await loadAllData();
        alert('Pago eliminado y montos revertidos al préstamo');
      } catch (error) {
        alert('Error al eliminar el pago: ' + error.message);
      }
    }
  };

  // Payment processing
  // Payment processing - VERSIÓN CORREGIDA COMPLETA
  const processPayment = async (paymentData) => {
  const loan = loans.find(l => l.id === paymentData.loanId);
  if (!loan) return;

  // Calculate total interest from loan start to payment date
  const loanStartDate = loan.startDate;
  const paymentDate = paymentData.date;
  const totalDays = daysBetween(loanStartDate, paymentDate);
  
  let totalInterestToDate = 0;
  let interestAlreadyPaid = 0;
  
  // Calculate total interest from loan start to payment date
  if (totalDays > 0 && loan.originalPrincipal > 0) {
    // Use originalPrincipal for the entire period
    totalInterestToDate = calculateInterest(loan.originalPrincipal, loan.interestRate, totalDays);
    
    // Calculate how much interest has already been paid in previous payments
    const previousPayments = payments.filter(p => 
      p.loanId === loan.id && p.date <= paymentDate
    );
    interestAlreadyPaid = previousPayments.reduce((sum, p) => sum + p.interestPaid, 0);
  }
  
  // Current accrued interest is total interest minus what's been paid
  const currentAccruedInterest = Math.max(0, totalInterestToDate - interestAlreadyPaid);
  
  // For the interest event, we only record the NEW interest since last accrual
  const lastAccrualDate = loan.lastInterestAccrual || loan.startDate;
  const daysSinceLastAccrual = daysBetween(lastAccrualDate, paymentDate);
  let newInterestAmount = 0;
  
  if (daysSinceLastAccrual > 0 && loan.remainingPrincipal > 0) {
    newInterestAmount = calculateInterest(loan.remainingPrincipal, loan.interestRate, daysSinceLastAccrual);
    
    // Create and save interest event for the new interest
    const interestEvent = {
      id: `${Date.now()}-${Math.random()}`,
      loanId: loan.id,
      date: paymentData.date,
      amount: newInterestAmount,
      days: daysSinceLastAccrual,
      principal: loan.remainingPrincipal
    };
    
    try {
      await db.saveInterestEvent(interestEvent);
    } catch (error) {
      console.error('Error saving interest event:', error);
    }
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
      
      // Generate and save invoice for interest paid
      const invoice = {
        loanId: loan.id,
        date: paymentData.date,
        amount: interestPaid,
        description: `Pago de intereses - Préstamo #${loan.id}`,
        type: 'interest'
      };
      
      try {
        const savedInvoice = await db.saveInvoice(invoice);
        setInvoices([...invoices, savedInvoice]);
      } catch (error) {
        console.error('Error saving invoice:', error);
      }
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

  try {
    // Save payment
    await db.savePayment(payment);

    // Update loan - THIS IS CRITICAL: We need to update the accruedInterest correctly
    const newRemainingPrincipal = loan.remainingPrincipal - principalPaid;
    
    // The new accrued interest should be the total interest minus ALL paid interest (including this payment)
    const totalInterestPaidIncludingThis = interestAlreadyPaid + interestPaid;
    const newAccruedInterest = Math.max(0, totalInterestToDate - totalInterestPaidIncludingThis);
    
    await db.updateLoan(loan.id, {
      remainingPrincipal: newRemainingPrincipal,
      accruedInterest: newAccruedInterest,
      status: (newRemainingPrincipal < 0.01 && newAccruedInterest < 0.01) ? 'Paid' : 'Open',
      lastInterestAccrual: paymentData.date
    });

    // Reload all data to ensure consistency
    await loadAllData();
    
    setShowPaymentForm(false);
    
    // Show detailed payment breakdown
    alert(`Pago registrado exitosamente:\n\nInterés total a la fecha: ${formatCurrency(totalInterestToDate)}\nInterés ya pagado: ${formatCurrency(interestAlreadyPaid)}\nInterés pendiente: ${formatCurrency(currentAccruedInterest)}\nInterés pagado ahora: ${formatCurrency(interestPaid)}\nPrincipal pagado: ${formatCurrency(principalPaid)}\n\nPrincipal restante: ${formatCurrency(newRemainingPrincipal)}\nInterés pendiente: ${formatCurrency(newAccruedInterest)}`);
  } catch (error) {
    alert('Error al procesar el pago: ' + error.message);
  }
  };

  // Verification function to fix existing loans with incorrect status
  const verifyAndFixLoanStatuses = async () => {
    let fixedCount = 0;
    
    for (const loan of loans) {
      // Check if loan should be marked as 'Paid' but currently shows 'Open'
      if (loan.status === 'Open' && 
          loan.remainingPrincipal < 0.01 && 
          (loan.accruedInterest || 0) < 0.01) {
        
        try {
          await db.updateLoan(loan.id, { status: 'Paid' });
          fixedCount++;
        } catch (error) {
          console.error(`Error fixing status for loan ${loan.id}:`, error);
        }
      }
    }
    
    if (fixedCount > 0) {
      await loadAllData();
      alert(`Se corrigieron ${fixedCount} préstamo(s) con estado incorrecto`);
    } else {
      alert('No se encontraron préstamos con estados incorrectos');
    }
  };


  // Agregar después de la función verifyAndFixLoanStatuses (alrededor de la línea 391):
const migrateLoanNumbers = async () => {
  let migratedCount = 0;
  
  for (const loan of loans) {
    if (!loan.loanNumber) {
      const loanNumber = generateLoanNumber(loans.filter(l => l.loanNumber), loan.startDate);
      
      try {
        await db.updateLoan(loan.id, { loanNumber });
        migratedCount++;
      } catch (error) {
        console.error(`Error migrating loan ${loan.id}:`, error);
      }
    }
  }
  
  if (migratedCount > 0) {
    await loadAllData();
    alert(`Se generaron números para ${migratedCount} préstamo(s) existente(s)`);
  } else {
    alert('Todos los préstamos ya tienen número asignado');
  }
};





  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Cargando datos...</h2>
          <p className="text-gray-600">
            {isElectron ? 'Conectando con la base de datos SQLite...' : 'Cargando desde el navegador...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Sistema de Gestión de Préstamos
              {isElectron && <span className="text-sm font-normal text-green-600 ml-2">(Base de datos conectada)</span>}
            </h1>
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
            onVerifyLoanStatuses={verifyAndFixLoanStatuses}
            onMigrateLoanNumbers={migrateLoanNumbers}  // Agregar esta línea
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
          getNextLoanId={getNextLoanId}  // Agregar esta línea
        />
      )}
      {showPaymentForm && (
        <PaymentForm 
          loans={loans}
          payments={payments}
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

export default AppWithDB;