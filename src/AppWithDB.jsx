// src/AppWithDB.jsx
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import LoansList from './pages/LoansList';
import InterestPayments from './pages/InterestPayments';
import PaymentsList from './pages/PaymentsList';
import LoanForm from './components/LoanForm';
import PaymentForm from './components/PaymentForm';
import LoanDetails from './components/LoanDetails';

import MonthlyInvoices from './pages/MonthlyInvoices';

import AccountHistory from './pages/AccountHistory';
import TransactionForm from './components/TransactionForm';

import { calculateInterest, daysBetween, formatCurrency, generateLoanNumber } from './utils/loanCalculations';
import useDatabase from './hooks/useDatabase';

// Import monthly invoice generator functions
import { 
  generateAllHistoricalInvoices, 
  regenerateAffectedInvoices,
  checkAndGeneratePreviousMonth 
} from './utils/monthlyInvoiceGenerator';

function AppWithDB() {
  // Database hook
  const { isElectron, db } = useDatabase();
  
  // State management
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [interestPayments, setInterestPayments] = useState([]);
  const [interestEvents, setInterestEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyInvoices, setMonthlyInvoices] = useState([]);
  
  // Invoice generation state flags
  const [hasGeneratedInvoices, setHasGeneratedInvoices] = useState(false);
  const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);
  
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


// Add this useEffect for automatic daily interest calculation
  useEffect(() => {
  const performDailyInterestCalculation = async () => {
    // Only run if we have loans and database is ready
    if (!isLoading && loans.length > 0 && db) {
      const today = new Date().toISOString().split('T')[0];
      const lastCalc = localStorage.getItem('lastDailyCalculation');
      
      // Check if we already calculated today
      if (lastCalc === today) {
        console.log('Interest already calculated for today:', today);
        return;
      }
      
      console.log('Running daily interest calculation for:', today);
      
      const openLoans = loans.filter(loan => loan.status === 'Open');
      const interestEventsToSave = [];
      const loansToUpdate = [];
      
      for (const loan of openLoans) {
        // Find last payment or use last interest accrual
        const loanPayments = payments.filter(p => p.loanId === loan.id);
        const lastPayment = loanPayments.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        
        const lastCalculationDate = lastPayment 
          ? lastPayment.date 
          : (loan.lastInterestAccrual || loan.startDate);
        
        // Only calculate if we haven't calculated up to today yet
        if (lastCalculationDate < today) {
          const days = daysBetween(lastCalculationDate, today);
          
          if (days > 0 && loan.remainingPrincipal > 0) {
            const interest = calculateInterest(
              loan.remainingPrincipal,
              loan.interestRate,
              days
            );
            
            // Create interest event
            const interestEvent = {
              id: `daily-${Date.now()}-${loan.id}`,
              loanId: loan.id,
              date: today,
              amount: interest,
              days: days,
              principal: loan.remainingPrincipal,
              type: 'daily_accrual',
              description: `Interés diario acumulado del ${lastCalculationDate} al ${today}`
            };
            
            interestEventsToSave.push(interestEvent);
            
            loansToUpdate.push({
              id: loan.id,
              accruedInterest: (loan.accruedInterest || 0) + interest,
              lastInterestAccrual: today
            });
            
            console.log(`Loan ${loan.loanNumber}: Calculated ${days} days of interest: ${interest.toFixed(2)}`);
          }
        }
      }
      
      // Save all updates
      if (interestEventsToSave.length > 0) {
        try {
          console.log(`Saving ${interestEventsToSave.length} interest events...`);
          
          // Save interest events
          for (const event of interestEventsToSave) {
            await db.saveInterestEvent(event);
          }
          
          // Update loans
          for (const update of loansToUpdate) {
            await db.updateLoan(update.id, {
              accruedInterest: update.accruedInterest,
              lastInterestAccrual: update.lastInterestAccrual
            });
          }
          
          // Mark today as calculated
          localStorage.setItem('lastDailyCalculation', today);
          
          // Reload data to show updates
          await loadAllData();
          
          console.log(`Daily interest calculation complete. Updated ${loansToUpdate.length} loans.`);
          
          // Optional: Show a subtle notification instead of alert
          // You could use a toast notification library here
          if (loansToUpdate.length > 0) {
            console.log(`✓ Intereses actualizados automáticamente para ${loansToUpdate.length} préstamo(s)`);
          }
          
        } catch (error) {
          console.error('Error in daily interest calculation:', error);
        }
      } else {
        // Still mark today as checked even if no updates needed
        localStorage.setItem('lastDailyCalculation', today);
        console.log('No interest updates needed today');
      }
    }
  };
  
  // Run the calculation
  performDailyInterestCalculation();
  }, [isLoading, loans.length, db]); // Dependencies ensure it runs when data is ready

  // Add useEffect to generate invoices when data is loaded (run only once)
  useEffect(() => {
    // Only run once when data is ready and hasn't been run yet
    if (!isLoading && loans.length > 0 && db && !hasGeneratedInvoices && !isGeneratingInvoices) {
      generateMissingInvoices();
    }
  }, [isLoading, loans.length, db, hasGeneratedInvoices, isGeneratingInvoices]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [loansData, paymentsData, interestPaymentsData, eventsData, transactionsData, monthlyInvoicesData] = await Promise.all([
        db.getLoans(),
        db.getPayments(),
        db.getInterestPayments(),
        db.getInterestEvents(),
        db.getAccountTransactions ? db.getAccountTransactions() : Promise.resolve([]),
        db.getMonthlyInvoices()
      ]);
      
      setLoans(loansData);
      setPayments(paymentsData);
      setInterestPayments(interestPaymentsData);
      setInterestEvents(eventsData);
      setAccountTransactions(transactionsData);
      setMonthlyInvoices(monthlyInvoicesData);
      
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

  // Add this function to generate missing invoices on load
  const generateMissingInvoices = async () => {
    // Prevent duplicate generation attempts
    if (isGeneratingInvoices || hasGeneratedInvoices) {
      return;
    }
    
    // Check if we have the necessary data
    if (!loans || loans.length === 0 || !db) {
      return;
    }
    
    try {
      setIsGeneratingInvoices(true);
      console.log('Checking for missing monthly invoices...');
      
      const generated = await generateAllHistoricalInvoices(loans, payments, db, false);
      
      if (generated && generated.length > 0) {
        console.log(`Generated ${generated.length} missing invoices`);
        // Reload monthly invoices
        const updatedInvoices = await db.getMonthlyInvoices();
        setMonthlyInvoices(updatedInvoices);
      }
      
      // Mark as completed to prevent re-runs
      setHasGeneratedInvoices(true);
      
    } catch (error) {
      console.error('Error generating missing invoices:', error);
    } finally {
      setIsGeneratingInvoices(false);
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
      
      // Reload data first to get updated loans
      await loadAllData();
      
      // Then regenerate affected invoices with updated data
      try {
        console.log('Regenerating invoices after loan creation...');
        const regenerated = await regenerateAffectedInvoices(loanData.startDate, loans, payments, db);
        
        if (regenerated && regenerated.length > 0) {
          console.log(`Regenerated ${regenerated.length} invoices after loan creation`);
          const updatedInvoices = await db.getMonthlyInvoices();
          setMonthlyInvoices(updatedInvoices);
        }
      } catch (error) {
        console.error('Error regenerating invoices:', error);
      }
      
      setShowLoanForm(false);
      alert('Préstamo creado exitosamente');
    } catch (error) {
      console.error('Full error:', error); // DEBUG
      alert('Error al crear el préstamo: ' + error.message);
    }
  };

  // Add button to manually regenerate all invoices (for testing/admin)
  const forceRegenerateAllInvoices = async () => {
    if (window.confirm('¿Regenerar todas las facturas mensuales? Esto sobrescribirá las existentes.')) {
      try {
        setIsLoading(true);
        const generated = await generateAllHistoricalInvoices(loans, payments, db, true);
        alert(`Se regeneraron ${generated.length} facturas mensuales`);
        const updatedInvoices = await db.getMonthlyInvoices();
        setMonthlyInvoices(updatedInvoices);
      } catch (error) {
        alert('Error regenerando facturas: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Add manual generation function for testing
  const manualGenerateInvoices = async () => {
    if (isGeneratingInvoices) {
      alert('Ya se están generando facturas, por favor espere...');
      return;
    }
    
    try {
      setIsGeneratingInvoices(true);
      const generated = await generateAllHistoricalInvoices(loans, payments, db, false);
      
      if (generated && generated.length > 0) {
        alert(`Se generaron ${generated.length} facturas mensuales`);
        const updatedInvoices = await db.getMonthlyInvoices();
        setMonthlyInvoices(updatedInvoices);
      } else {
        alert('Todas las facturas ya están generadas');
      }
    } catch (error) {
      alert('Error generando facturas: ' + error.message);
    } finally {
      setIsGeneratingInvoices(false);
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
      
      // Regenerate affected invoices
      try {
        console.log('Regenerating invoices after loan edit...');
        const regenerated = await regenerateAffectedInvoices(loanData.startDate, loans, payments, db);
        
        if (regenerated && regenerated.length > 0) {
          console.log(`Regenerated ${regenerated.length} invoices after loan edit`);
          const updatedInvoices = await db.getMonthlyInvoices();
          setMonthlyInvoices(updatedInvoices);
        }
      } catch (error) {
        console.error('Error regenerating invoices:', error);
      }
      
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
        setInterestPayments(interestPayments.filter(payment => payment.loanId !== loanId));
        setInterestEvents(interestEvents.filter(event => event.loanId !== loanId));
        
        // Regenerate affected invoices after deletion
        try {
          const today = new Date().toISOString().split('T')[0];
          console.log('Regenerating invoices after loan deletion...');
          const regenerated = await regenerateAffectedInvoices(today, loans, payments, db);
          
          if (regenerated && regenerated.length > 0) {
            console.log(`Regenerated ${regenerated.length} invoices after loan deletion`);
            const updatedInvoices = await db.getMonthlyInvoices();
            setMonthlyInvoices(updatedInvoices);
          }
        } catch (error) {
          console.error('Error regenerating invoices after loan deletion:', error);
        }
        
        alert('Préstamo eliminado exitosamente');
      } catch (error) {
        alert('Error al eliminar el préstamo: ' + error.message);
      }
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

  // Payment processing - CORRECTED VERSION WITH PROPER INTEREST CALCULATION
  const processPayment = async (paymentData) => {
    
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }
      // VALIDATION 2: Check valid date format
    if (!paymentData.date || !paymentData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      alert('Por favor seleccione una fecha válida');
      return;
    }
      // VALIDATION 3: Prevent future date payments
    const today = new Date().toISOString().split('T')[0];
    if (paymentData.date > today) {
      alert(`No se pueden registrar pagos con fecha futura.\nFecha máxima permitida: ${formatDate(today)}`);
      return;
    }

    // Get all open loans sorted by ID for sequential payment
    const openLoans = loans
      .filter(loan => loan.status === 'Open')
      .sort((a, b) => a.id - b.id);

    if (openLoans.length === 0) {
      alert('No hay préstamos abiertos para pagar');
      return;
    }



      // VALIDATION 4: Check payment date is not before any loan start date
    for (const loan of openLoans) {
      if (paymentData.date < loan.startDate) {
        alert(
          `La fecha de pago (${formatDate(paymentData.date)}) no puede ser anterior ` +
          `a la fecha de inicio del préstamo ${loan.loanNumber || loan.id} (${formatDate(loan.startDate)})`
        );
        return;
      }
    }

    // VALIDATION 5: Check for existing payments after this date
    const futurePayments = payments.filter(p => 
      openLoans.some(loan => loan.id === p.loanId) && 
      p.date > paymentData.date
    );
  
    if (futurePayments.length > 0) {
      const futurePaymentDates = futurePayments
        .map(p => formatDate(p.date))
        .join(', ');
    
      const proceed = window.confirm(
        `⚠️ Advertencia: Existen pagos registrados en fechas posteriores (${futurePaymentDates}).\n\n` +
        `Registrar este pago podría afectar los cálculos de intereses.\n\n` +
        `¿Desea continuar de todos modos?`
      );
    
      if (!proceed) return;
    }

    // CRITICAL FIX: For each loan, we need to RECALCULATE interest from scratch
    // up to the payment date, NOT add to existing interest
    const loansWithCorrectInterest = [];
    const interestEventsToSave = [];
    
    for (const loan of openLoans) {
      // Determine the starting point for interest calculation
      // This should be the later of: loan start date OR last payment date
      const lastPaymentToThisLoan = payments
        .filter(p => p.loanId === loan.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      const interestStartDate = lastPaymentToThisLoan 
        ? lastPaymentToThisLoan.date 
        : loan.startDate;
      
      // Calculate days from the interest start date to the payment date
      const daysToPayment = daysBetween(interestStartDate, paymentData.date);
      
      let correctInterest = 0;
      
      if (daysToPayment > 0 && loan.remainingPrincipal > 0) {
        // Calculate interest ONLY up to the payment date
        correctInterest = calculateInterest(
          loan.remainingPrincipal, 
          loan.interestRate, 
          daysToPayment
        );
        
        // Create interest event for audit trail
        const interestEvent = {
          id: `${Date.now()}-${Math.random()}-${loan.id}`,
          loanId: loan.id,
          date: paymentData.date,
          amount: correctInterest,
          days: daysToPayment,
          principal: loan.remainingPrincipal,
          description: `Interest from ${interestStartDate} to ${paymentData.date}`
        };
        
        interestEventsToSave.push(interestEvent);
        
        console.log(`Loan ${loan.loanNumber || loan.id}: Interest calculated from ${interestStartDate} to ${paymentData.date} (${daysToPayment} days): ${correctInterest.toFixed(2)}`);
      }
      
      // Create a loan object with the CORRECT interest amount
      // This replaces whatever incorrect interest was there before
      loansWithCorrectInterest.push({
        ...loan,
        accruedInterest: correctInterest  // NOT adding to existing, REPLACING it
      });
    }

    // Calculate total debt with CORRECT interest amounts
    const totalDebt = loansWithCorrectInterest.reduce((sum, loan) => {
      return sum + loan.remainingPrincipal + loan.accruedInterest;
    }, 0);

    if (parseFloat(paymentData.amount) > totalDebt) {
      alert(`El pago excede la deuda total de ${formatCurrency(totalDebt)}`);
      return;
    }

    // Process payment across loans with correct interest
    let remainingPayment = parseFloat(paymentData.amount);
    const paymentsToProcess = [];
    let paymentBreakdown = [];

    for (const loan of loansWithCorrectInterest) {
      if (remainingPayment <= 0) break;

      // Calculate total owed for this loan (with CORRECT interest)
      const totalOwed = loan.remainingPrincipal + loan.accruedInterest;
      
      if (totalOwed <= 0) continue;

      const paymentForThisLoan = Math.min(remainingPayment, totalOwed);
      
      // Apply payment: interest first, then principal
      let interestPaid = 0;
      let principalPaid = 0;
      
      if (loan.accruedInterest > 0) {
        interestPaid = Math.min(paymentForThisLoan, loan.accruedInterest);
        principalPaid = paymentForThisLoan - interestPaid;
      } else {
        principalPaid = paymentForThisLoan;
      }

      // Create payment record
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
        newAccruedInterest: loan.accruedInterest - interestPaid  // Will be 0 if fully paid
      });

      paymentBreakdown.push({
        loanNumber: loan.loanNumber || `#${loan.id}`,
        amount: paymentForThisLoan,
        interestPaid,
        principalPaid,
        status: (loan.remainingPrincipal - principalPaid) <= 0.01 && 
                (loan.accruedInterest - interestPaid) <= 0.01 ? 'Pagado' : 'Parcial'
      });

      remainingPayment -= paymentForThisLoan;
    }

    if (paymentsToProcess.length === 0) {
      alert('No se pudo procesar el pago');
      return;
    }

    try {
      // Save all interest events
      for (const interestEvent of interestEventsToSave) {
        await db.saveInterestEvent(interestEvent);
      }
      
      // Save all payments and update loans
      for (const processedPayment of paymentsToProcess) {
        const { payment, loan, newRemainingPrincipal, newAccruedInterest } = processedPayment;
        
        await db.savePayment(payment);
        
        if (payment.interestPaid > 0) {
          const interestPayment = {
            loanId: loan.id,
            date: paymentData.date,
            amount: payment.interestPaid,
            description: `Pago de intereses - Préstamo ${loan.loanNumber || `#${loan.id}`}`,
            type: 'interest_payment'
          };
          await db.saveInterestPayment(interestPayment);
        }
        
        // Update loan with CORRECT values
        const isLoanPaid = newRemainingPrincipal < 0.01 && newAccruedInterest < 0.01;
        
        await db.updateLoan(loan.id, {
          remainingPrincipal: newRemainingPrincipal,
          accruedInterest: newAccruedInterest,  // This will be 0 after payment
          status: isLoanPaid ? 'Paid' : 'Open',
          lastInterestAccrual: paymentData.date  // Set to payment date
        });
      }

      // Create account transaction for the payment
      const newBalance = currentBalance + paymentData.amount;
      const transaction = {
        balance: newBalance,
        transaction_type: 'payment_in',
        transaction_amount: paymentData.amount,
        related_loan_id: paymentsToProcess[0].loan.id,
        description: `Pago recibido - ${paymentsToProcess.length} préstamo(s)`,
        date: paymentData.date,
        createdAt: new Date().toISOString()
      };

      await db.saveAccountTransaction(transaction);
      
      await loadAllData();
      setShowPaymentForm(false);
      
      // Show payment breakdown
      let message = `Pago de ${formatCurrency(paymentData.amount)} procesado exitosamente:\n\n`;
      paymentBreakdown.forEach(breakdown => {
        message += `Préstamo ${breakdown.loanNumber}:\n`;
        message += `- Monto aplicado: ${formatCurrency(breakdown.amount)}\n`;
        message += `- Interés pagado: ${formatCurrency(breakdown.interestPaid)}\n`;
        message += `- Principal pagado: ${formatCurrency(breakdown.principalPaid)}\n`;
        message += `- Estado: ${breakdown.status}\n\n`;
      });
      
      // After successful payment processing, regenerate affected invoices
      try {
        console.log('Regenerating affected monthly invoices...');
        const regenerated = await regenerateAffectedInvoices(paymentData.date, loans, payments, db);
        
        if (regenerated && regenerated.length > 0) {
          console.log(`Regenerated ${regenerated.length} invoices`);
          // Reload monthly invoices
          const updatedInvoices = await db.getMonthlyInvoices();
          setMonthlyInvoices(updatedInvoices);
        }
      } catch (error) {
        console.error('Error regenerating invoices:', error);
      }
      
      alert(message);
      
    } catch (error) {
      console.error('Error processing payment:', error);
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
              onClick={() => setActiveTab('interestPayments')}
              className={`py-4 px-1 border-b-2 transition-colors ${
                activeTab === 'interestPayments' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pagos de Intereses
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

            <button
                onClick={() => setActiveTab('monthlyInvoices')}
               className={`py-4 px-1 border-b-2 transition-colors ${
                  activeTab === 'monthlyInvoices' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Facturas Mensuales
            </button>


          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {activeTab === 'dashboard' && (
          <Dashboard 
            loans={loans}
            payments={payments}
            interestPayments={interestPayments}
            currentBalance={currentBalance}
            onNewLoan={() => setShowLoanForm(true)}
            onNewPayment={() => setShowPaymentForm(true)}
            onViewInterestPayments={() => setActiveTab('interestPayments')}
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
        {activeTab === 'interestPayments' && (
          <InterestPayments 
            interestPayments={interestPayments}
            loans={loans}
          />
        )}


        {activeTab === 'account' && (
            <AccountHistory 
              transactions={accountTransactions}
              onNewTransaction={() => setShowTransactionForm(true)}
            />
        )}

        {activeTab === 'monthlyInvoices' && (
          <MonthlyInvoices 
           monthlyInvoices={monthlyInvoices}
            loans={loans}
            interestPayments={interestPayments}
            onRegenerateInvoices={manualGenerateInvoices}
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
        />
      )}
      {selectedLoan && (
        <LoanDetails 
          loan={selectedLoan}
          payments={payments}
          interestPayments={interestPayments}
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