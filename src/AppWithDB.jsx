// src/AppWithDB.jsx
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import LoansList from './pages/LoansList';
import InvoicesList from './pages/InvoicesList';
import PaymentsList from './pages/PaymentsList';
import LoanForm from './components/LoanForm';
import PaymentForm from './components/PaymentForm';
import LoanDetails from './components/LoanDetails';

import AccountHistory from './pages/AccountHistory';
import TransactionForm from './components/TransactionForm';

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
  
  // Account balance state
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);

  const [showTransactionForm, setShowTransactionForm] = useState(false);

  // Load data from database on mount
  useEffect(() => {
    loadAllData();
  }, [isElectron]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [loansData, paymentsData, invoicesData, eventsData, transactionsData] = await Promise.all([
        db.getLoans(),
        db.getPayments(),
        db.getInvoices(),
        db.getInterestEvents(),
        db.getAccountTransactions ? db.getAccountTransactions() : Promise.resolve([])
      ]);
      
      setLoans(loansData);
      setPayments(paymentsData);
      setInvoices(invoicesData);
      setInterestEvents(eventsData);
      setAccountTransactions(transactionsData);
      
      // Calculate current balance from transactions
      const balance = transactionsData.length > 0 
        ? transactionsData[transactionsData.length - 1].balance || 0 
        : 0;
      setCurrentBalance(balance);
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
      
      // Create account transaction for loan creation
      const newBalance = currentBalance - loanData.amount;
      const transaction = {
        balance: newBalance,
        transaction_type: 'loan_out',
        transaction_amount: -loanData.amount,
        related_loan_id: loanId,
        description: `Préstamo ${loanNumber} - ${loanData.debtorName}`,
        date: loanData.startDate,
        createdAt: new Date().toISOString()
      };
      
      console.log('Saving account transaction:', transaction); // DEBUG
      
      const result = await db.saveAccountTransaction(transaction);
      console.log('Transaction save result:', result); // DEBUG
      
      await loadAllData();
      setShowLoanForm(false);
      alert('Préstamo creado exitosamente');
    } catch (error) {
      console.error('Full error:', error); // DEBUG
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

  // Payment processing - CASCADING VERSION
  const processPayment = async (paymentData) => {
    let remainingPayment = paymentData.amount;
    const openLoans = loans
      .filter(l => l.status === 'Open')
      .sort((a, b) => a.id - b.id); // Ensure loans are processed in ID order
    
    if (openLoans.length === 0) {
      alert('No hay préstamos abiertos para pagar');
      return;
    }

    // Calculate total debt across all open loans
    const totalDebt = openLoans.reduce((sum, loan) => {
      return sum + loan.remainingPrincipal + (loan.accruedInterest || 0);
    }, 0);

    // Validate payment doesn't exceed total debt
    if (paymentData.amount > totalDebt) {
      alert(`El pago de ${formatCurrency(paymentData.amount)} excede la deuda total de ${formatCurrency(totalDebt)}.\n\nPor favor ingrese un monto menor o igual a ${formatCurrency(totalDebt)}.`);
      return;
    }

    const paymentsToProcess = [];
    let paymentBreakdown = [];

    // Process payment across multiple loans
    for (const loan of openLoans) {
      if (remainingPayment <= 0) break;

      // Calculate total owed for this loan
      const totalOwed = loan.remainingPrincipal + (loan.accruedInterest || 0);
      
      if (totalOwed <= 0) continue; // Skip if nothing owed

      // Calculate how much to pay on this loan
      const paymentForThisLoan = Math.min(remainingPayment, totalOwed);
      
      // Calculate interest and principal portions
      let interestPaid = 0;
      let principalPaid = 0;
      
      if (loan.accruedInterest > 0) {
        interestPaid = Math.min(paymentForThisLoan, loan.accruedInterest);
        principalPaid = paymentForThisLoan - interestPaid;
      } else {
        principalPaid = paymentForThisLoan;
      }

      // Create payment record for this loan
      const paymentId = payments.length + paymentsToProcess.length + 1;
      
      paymentsToProcess.push({
        payment: {
          id: paymentId,
          loanId: loan.id,
          date: paymentData.date,
          interestPaid,
          principalPaid,
          totalPaid: paymentForThisLoan
        },
        loan: loan,
        newRemainingPrincipal: loan.remainingPrincipal - principalPaid,
        newAccruedInterest: (loan.accruedInterest || 0) - interestPaid
      });

      // Track payment breakdown for user feedback
      paymentBreakdown.push({
        loanNumber: loan.loanNumber || `#${loan.id}`,
        amount: paymentForThisLoan,
        interestPaid,
        principalPaid,
        status: (loan.remainingPrincipal - principalPaid) <= 0.01 && ((loan.accruedInterest || 0) - interestPaid) <= 0.01 ? 'Pagado' : 'Parcial'
      });

      remainingPayment -= paymentForThisLoan;
    }

    // If no payments to process, something went wrong
    if (paymentsToProcess.length === 0) {
      alert('No se pudo procesar el pago');
      return;
    }

    try {
      // Save all payments and update loans
      for (const processedPayment of paymentsToProcess) {
        const { payment, loan, newRemainingPrincipal, newAccruedInterest } = processedPayment;
        
        // Save payment
        await db.savePayment(payment);
        
        // Generate invoice if interest was paid
        if (payment.interestPaid > 0) {
          const invoice = {
            loanId: loan.id,
            date: paymentData.date,
            amount: payment.interestPaid,
            description: `Pago de intereses - Préstamo ${loan.loanNumber || `#${loan.id}`}`,
            type: 'interest'
          };
          
          await db.saveInvoice(invoice);
        }
        
        // Update loan
        const isLoanPaid = newRemainingPrincipal < 0.01 && newAccruedInterest < 0.01;
        
        await db.updateLoan(loan.id, {
          remainingPrincipal: newRemainingPrincipal,
          accruedInterest: newAccruedInterest,
          status: isLoanPaid ? 'Paid' : 'Open',
          lastInterestAccrual: paymentData.date
        });
      }

      // Create single account transaction for the total payment
      const newBalance = currentBalance + paymentData.amount;
      const transaction = {
        balance: newBalance,
        transaction_type: 'payment_in',
        transaction_amount: paymentData.amount,
        related_loan_id: paymentsToProcess[0].loan.id, // Reference first loan
        description: `Pago recibido - ${paymentsToProcess.length} préstamo(s)`,
        date: paymentData.date,
        createdAt: new Date().toISOString()
      };

      await db.saveAccountTransaction(transaction);
      
      // Reload all data
      await loadAllData();
      
      setShowPaymentForm(false);
      
      // Show detailed breakdown
      let message = `Pago de ${formatCurrency(paymentData.amount)} procesado exitosamente:\n\n`;
      
      paymentBreakdown.forEach(breakdown => {
        message += `Préstamo ${breakdown.loanNumber}:\n`;
        message += `  - Monto aplicado: ${formatCurrency(breakdown.amount)}\n`;
        message += `  - Interés pagado: ${formatCurrency(breakdown.interestPaid)}\n`;
        message += `  - Principal pagado: ${formatCurrency(breakdown.principalPaid)}\n`;
        message += `  - Estado: ${breakdown.status}\n\n`;
      });
      
      if (remainingPayment > 0) {
        message += `\nNota: Sobraron ${formatCurrency(remainingPayment)} del pago. Todos los préstamos están pagados.`;
      }
      
      alert(message);
      
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

const processManualTransaction = async (transactionData) => {
  const isDeposit = transactionData.type === 'deposit';
  const transactionAmount = isDeposit ? transactionData.amount : -transactionData.amount;
  const newBalance = currentBalance + transactionAmount;
  
  // Determine if this is the initial balance (first transaction ever OR currentBalance is 0 and it's a deposit)
  const isInitialBalance = accountTransactions.length === 0 && isDeposit;
  
  const transaction = {
    balance: newBalance,
    transaction_type: isInitialBalance ? 'initial' : transactionData.type,
    transaction_amount: transactionAmount,
    related_loan_id: null,
    description: isInitialBalance ? 'Balance Inicial' : transactionData.description,
    date: transactionData.date,
    createdAt: new Date().toISOString()
  };
  
  try {
    await db.saveAccountTransaction(transaction);
    await loadAllData();
    setShowTransactionForm(false);
    alert(`${isDeposit ? 'Depósito' : 'Retiro'} registrado exitosamente`);
  } catch (error) {
    alert('Error al registrar la transacción: ' + error.message);
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


            <button
  onClick={() => setActiveTab('account')}
  className={`py-4 px-1 border-b-2 transition-colors ${
    activeTab === 'account' 
      ? 'border-blue-500 text-blue-600' 
      : 'border-transparent text-gray-500 hover:text-gray-700'
  }`}
>
  Cuenta
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
            currentBalance={currentBalance}
            onNewLoan={() => setShowLoanForm(true)}
            onNewPayment={() => setShowPaymentForm(true)}
            onAccrueInterest={accrueInterestForAllLoans}
            onViewInvoices={() => setActiveTab('invoices')}
            onVerifyLoanStatuses={verifyAndFixLoanStatuses}
            onViewAccount={() => setActiveTab('account')}  // Agregar esta línea
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


        {activeTab === 'account' && (
  <AccountHistory 
    transactions={accountTransactions}
    onNewTransaction={() => setShowTransactionForm(true)}
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


        {showTransactionForm && (
  <TransactionForm 
    onSubmit={processManualTransaction}
    onCancel={() => setShowTransactionForm(false)}
    currentBalance={currentBalance}
    accountTransactions={accountTransactions}
  />
        )}
    </div>
  );
}

export default AppWithDB;