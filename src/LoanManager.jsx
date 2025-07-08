import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, FileText, Plus, Trash2, Edit, CheckCircle, AlertCircle } from 'lucide-react';

const LoanManagerSystem = () => {
  // Initial state
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [interestEvents, setInterestEvents] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
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

  // Calculate daily interest rate
  const calculateDailyRate = (annualRate) => annualRate / 365 / 100;

  // Calculate interest for a loan
  const calculateInterest = (principal, rate, days) => {
    const dailyRate = calculateDailyRate(rate);
    return principal * dailyRate * days;
  };

  // Calculate days between two dates
  const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get total outstanding principal
  const getTotalOutstandingPrincipal = () => {
    return loans
      .filter(loan => loan.status === 'Open')
      .reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
  };

  // Get total accrued interest
  const getTotalAccruedInterest = () => {
    return loans.reduce((sum, loan) => sum + (loan.accruedInterest || 0), 0);
  };

  // Create new loan
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

  // Update loan
  const updateLoan = (loanId, updates) => {
    setLoans(loans.map(loan => 
      loan.id === loanId ? { ...loan, ...updates } : loan
    ));
  };

  // Delete loan
  const deleteLoan = (loanId) => {
    if (window.confirm('¿Estás seguro de eliminar este préstamo?')) {
      setLoans(loans.filter(loan => loan.id !== loanId));
      // Also delete related payments, invoices, and interest events
      setPayments(payments.filter(payment => payment.loanId !== loanId));
      setInvoices(invoices.filter(invoice => invoice.loanId !== loanId));
      setInterestEvents(interestEvents.filter(event => event.loanId !== loanId));
    }
  };

  // Accrue interest for all loans
  const accrueInterestForAllLoans = () => {
    const today = new Date().toISOString().split('T')[0];
    
    loans.forEach(loan => {
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
          
          setInterestEvents([...interestEvents, interestEvent]);
          
          // Update loan
          updateLoan(loan.id, {
            accruedInterest: (loan.accruedInterest || 0) + interest,
            lastInterestAccrual: today
          });
        }
      }
    });
  };

  // Process payment
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
  };

  // Loan Form Component
  const LoanForm = () => {
    const [formData, setFormData] = useState({
      debtorName: '',
      amount: '',
      interestRate: 15,
      startDate: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = () => {
      if (!formData.debtorName || !formData.amount) {
        alert('Por favor complete todos los campos requeridos');
        return;
      }
      createLoan({
        ...formData,
        amount: parseFloat(formData.amount)
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4">Nuevo Préstamo</h3>
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Nombre del Deudor</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.debtorName}
                onChange={(e) => setFormData({...formData, debtorName: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Monto (MXN)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Tasa de Interés Anual (%)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.interestRate}
                onChange={(e) => setFormData({...formData, interestRate: parseFloat(e.target.value)})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Fecha de Inicio</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                Crear Préstamo
              </button>
              <button
                onClick={() => setShowLoanForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Payment Form Component
  const PaymentForm = () => {
    const [formData, setFormData] = useState({
      loanId: '',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });

    const openLoans = loans.filter(loan => loan.status === 'Open');

    const handleSubmit = () => {
      if (!formData.loanId || !formData.amount) {
        alert('Por favor complete todos los campos requeridos');
        return;
      }
      processPayment({
        ...formData,
        loanId: parseInt(formData.loanId),
        amount: parseFloat(formData.amount)
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4">Registrar Pago</h3>
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Préstamo</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.loanId}
                onChange={(e) => setFormData({...formData, loanId: e.target.value})}
              >
                <option value="">Seleccionar préstamo...</option>
                {openLoans.map(loan => (
                  <option key={loan.id} value={loan.id}>
                    {loan.debtorName} - ${loan.remainingPrincipal.toFixed(2)} pendiente
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Monto del Pago (MXN)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Fecha del Pago</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
              >
                Registrar Pago
              </button>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard Component
  const Dashboard = () => {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Panel de Control</h2>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Total Préstamos</span>
              <FileText className="text-gray-400" size={20} />
            </div>
            <p className="text-2xl font-bold">{loans.length}</p>
            <p className="text-sm text-green-600">{loans.filter(l => l.status === 'Open').length} activos</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Principal Pendiente</span>
              <DollarSign className="text-gray-400" size={20} />
            </div>
            <p className="text-2xl font-bold">${getTotalOutstandingPrincipal().toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Intereses Acumulados</span>
              <Calendar className="text-gray-400" size={20} />
            </div>
            <p className="text-2xl font-bold">${getTotalAccruedInterest().toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Facturas Generadas</span>
              <FileText className="text-gray-400" size={20} />
            </div>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setShowLoanForm(true)}
              className="flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600"
            >
              <Plus size={20} />
              Nuevo Préstamo
            </button>
            <button
              onClick={() => setShowPaymentForm(true)}
              className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600"
            >
              <DollarSign size={20} />
              Registrar Pago
            </button>
            <button
              onClick={accrueInterestForAllLoans}
              className="flex items-center justify-center gap-2 bg-yellow-500 text-white px-4 py-3 rounded-lg hover:bg-yellow-600"
            >
              <Calendar size={20} />
              Calcular Intereses
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className="flex items-center justify-center gap-2 bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600"
            >
              <FileText size={20} />
              Ver Facturas
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loans List Component
  const LoansList = () => {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Préstamos</h2>
          <button
            onClick={() => setShowLoanForm(true)}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            <Plus size={20} />
            Nuevo Préstamo
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deudor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal Original</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal Restante</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interés Acumulado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loans.map(loan => (
                <tr key={loan.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{loan.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{loan.debtorName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">${loan.originalPrincipal.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">${loan.remainingPrincipal.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">${(loan.accruedInterest || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      loan.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {loan.status === 'Open' ? 'Abierto' : 'Pagado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedLoan(loan)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => deleteLoan(loan.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Loan Details Component
  const LoanDetails = () => {
    if (!selectedLoan) return null;

    const loanPayments = payments.filter(p => p.loanId === selectedLoan.id);
    const loanInvoices = invoices.filter(i => i.loanId === selectedLoan.id);
    const loanInterestEvents = interestEvents.filter(e => e.loanId === selectedLoan.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Detalles del Préstamo #{selectedLoan.id}</h3>
            <button
              onClick={() => setSelectedLoan(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Deudor</p>
              <p className="font-semibold">{selectedLoan.debtorName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado</p>
              <p className="font-semibold">{selectedLoan.status === 'Open' ? 'Abierto' : 'Pagado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Principal Original</p>
              <p className="font-semibold">${selectedLoan.originalPrincipal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Principal Restante</p>
              <p className="font-semibold">${selectedLoan.remainingPrincipal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tasa de Interés</p>
              <p className="font-semibold">{selectedLoan.interestRate}% anual</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Interés Acumulado</p>
              <p className="font-semibold">${(selectedLoan.accruedInterest || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-semibold mb-4">Historial de Pagos</h4>
            {loanPayments.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-left pb-2">Monto Total</th>
                    <th className="text-left pb-2">Interés Pagado</th>
                    <th className="text-left pb-2">Principal Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {loanPayments.map(payment => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-2">{payment.date}</td>
                      <td className="py-2">${payment.totalPaid.toFixed(2)}</td>
                      <td className="py-2">${payment.interestPaid.toFixed(2)}</td>
                      <td className="py-2">${payment.principalPaid.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">No hay pagos registrados</p>
            )}
          </div>

          <div className="border-t pt-6 mt-6">
            <h4 className="font-semibold mb-4">Eventos de Interés</h4>
            {loanInterestEvents.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-left pb-2">Días</th>
                    <th className="text-left pb-2">Principal</th>
                    <th className="text-left pb-2">Interés Generado</th>
                  </tr>
                </thead>
                <tbody>
                  {loanInterestEvents.map(event => (
                    <tr key={event.id} className="border-b">
                      <td className="py-2">{event.date}</td>
                      <td className="py-2">{event.days}</td>
                      <td className="py-2">${event.principal.toFixed(2)}</td>
                      <td className="py-2">${event.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">No hay eventos de interés registrados</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Invoices Component
  const InvoicesList = () => {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Facturas</h2>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Préstamo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map(invoice => {
                const loan = loans.find(l => l.id === invoice.loanId);
                return (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{invoice.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{invoice.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{loan?.debtorName || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">{invoice.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">${invoice.amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
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
              className={`py-4 px-1 border-b-2 ${
                activeTab === 'dashboard' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Panel de Control
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`py-4 px-1 border-b-2 ${
                activeTab === 'loans' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Préstamos
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 ${
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
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'loans' && <LoansList />}
        {activeTab === 'invoices' && <InvoicesList />}
      </main>

      {/* Forms and Modals */}
      {showLoanForm && <LoanForm />}
      {showPaymentForm && <PaymentForm />}
      {selectedLoan && <LoanDetails />}
    </div>
  );
};

export default LoanManagerSystem;