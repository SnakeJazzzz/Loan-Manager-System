import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, FileText, Plus, CreditCard, CheckCircle, Calculator, Calendar, Info } from 'lucide-react';
import { formatCurrency, calculateInterest, daysBetween } from '../utils/loanCalculations';

const Dashboard = ({ 
  loans,
  payments,  // Add this prop
  invoices, 
  currentBalance,
  onNewLoan, 
  onNewPayment, 
  onViewInvoices,
  onVerifyLoanStatuses,
  onViewAccount
}) => {
  // State for interest calculator
  const [interestDate, setInterestDate] = useState(new Date().toISOString().split('T')[0]);
  const [interestPreview, setInterestPreview] = useState(null);
  const [showInterestDetails, setShowInterestDetails] = useState(false);

  // Calculate metrics
  const activeLoans = loans.filter(loan => loan.status === 'Open').length;
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
  const totalInterest = loans.reduce((sum, loan) => sum + (loan.accruedInterest || 0), 0);
  const totalPaid = loans.reduce((sum, loan) => sum + (loan.originalPrincipal - loan.remainingPrincipal), 0);

  // Calculate interest preview whenever date or loans change
  useEffect(() => {
    calculateInterestPreview();
  }, [interestDate, loans, payments]);

  const calculateInterestPreview = () => {
    if (!interestDate) {
      setInterestPreview(null);
      return;
    }

    const openLoans = loans.filter(loan => loan.status === 'Open');
    let totalInterestAmount = 0;
    const loanDetails = [];

    for (const loan of openLoans) {
      // Find the last payment for this loan to determine interest start date
      const loanPayments = payments?.filter(p => p.loanId === loan.id) || [];
      const lastPayment = loanPayments.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      const interestStartDate = lastPayment 
        ? lastPayment.date 
        : (loan.lastInterestAccrual || loan.startDate);
      
      // Calculate days from interest start to preview date
      const daysToDate = daysBetween(interestStartDate, interestDate);
      
      let interestAmount = 0;
      
      if (daysToDate > 0 && loan.remainingPrincipal > 0) {
        interestAmount = calculateInterest(
          loan.remainingPrincipal,
          loan.interestRate,
          daysToDate
        );
      }
      
      totalInterestAmount += interestAmount;
      
      loanDetails.push({
        loanId: loan.id,
        loanNumber: loan.loanNumber || `#${loan.id}`,
        debtorName: loan.debtorName,
        principal: loan.remainingPrincipal,
        interestRate: loan.interestRate,
        interest: interestAmount,
        days: daysToDate,
        fromDate: interestStartDate,
        toDate: interestDate,
        totalDebt: loan.remainingPrincipal + interestAmount
      });
    }

    setInterestPreview({
      date: interestDate,
      totalInterest: totalInterestAmount,
      totalPrincipal: openLoans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0),
      totalDebt: totalInterestAmount + openLoans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0),
      loanCount: openLoans.length,
      details: loanDetails
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
        <p className="text-gray-600">Resumen de préstamos y actividad reciente</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Préstamos Activos</span>
            <Users className="text-gray-400" size={20} />
          </div>
          <p className="text-2xl font-bold">{activeLoans}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Principal Pendiente</span>
            <DollarSign className="text-gray-400" size={20} />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalPrincipal)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Total Cobrado</span>
            <TrendingUp className="text-gray-400" size={20} />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Balance Cuenta</span>
            <CreditCard className="text-gray-400" size={20} />
          </div>
          <p className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(currentBalance || 0))}
          </p>
          <p className="text-sm text-gray-500">
            {currentBalance >= 0 ? 'Disponible' : 'Sobregiro'}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Facturas Generadas</span>
            <FileText className="text-gray-400" size={20} />
          </div>
          <p className="text-2xl font-bold">{invoices.length}</p>
        </div>
      </div>

      {/* Interest Calculator Section - NEW */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="text-blue-500" size={20} />
            Calculadora de Intereses
          </h3>
          <div className="flex items-center gap-2">
            <Info className="text-gray-400" size={16} />
            <span className="text-xs text-gray-500">Vista previa sin modificar préstamos</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline mr-1" size={14} />
              Calcular intereses hasta:
            </label>
            <input
              type="date"
              value={interestDate}
              onChange={(e) => setInterestDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Preview Results */}
          {interestPreview && (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Interés Total al {new Date(interestDate + 'T12:00:00').toLocaleDateString('es-MX')}</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(interestPreview.totalInterest)}</p>
                <p className="text-xs text-gray-500 mt-1">Para {interestPreview.loanCount} préstamo(s)</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Deuda Total</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(interestPreview.totalDebt)}</p>
                <p className="text-xs text-gray-500 mt-1">Principal + Intereses</p>
              </div>
            </>
          )}
        </div>
        
        {/* Detailed Breakdown */}
        {interestPreview && interestPreview.details.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowInterestDetails(!showInterestDetails)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {showInterestDetails ? '▼' : '▶'} Ver detalles por préstamo
            </button>
            
            {showInterestDetails && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {interestPreview.details.map(loan => (
                  <div key={loan.loanId} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-700">{loan.loanNumber} - {loan.debtorName}</p>
                        <p className="text-xs text-gray-500">
                          {loan.days} días ({new Date(loan.fromDate + 'T12:00:00').toLocaleDateString('es-MX')} - {new Date(loan.toDate + 'T12:00:00').toLocaleDateString('es-MX')})
                        </p>
                      </div>
                      <span className="font-bold text-blue-600">{formatCurrency(loan.interest)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div>Principal: {formatCurrency(loan.principal)}</div>
                      <div>Tasa: {loan.interestRate}%</div>
                      <div>Total: {formatCurrency(loan.totalDebt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={onNewLoan}
            className="flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
            Nuevo Préstamo
          </button>
          <button
            onClick={onNewPayment}
            className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition-colors"
          >
            <DollarSign size={20} />
            Registrar Pago
          </button>
          <button
            onClick={onViewInvoices}
            className="flex items-center justify-center gap-2 bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-colors"
          >
            <FileText size={20} />
            Ver Facturas
          </button>
          <button
            onClick={onVerifyLoanStatuses}
            className="flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <CheckCircle size={20} />
            Verificar Estados
          </button>
          <button
            onClick={onViewAccount}
            className="flex items-center justify-center gap-2 bg-indigo-500 text-white px-4 py-3 rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <CreditCard size={20} />
            Ver Cuenta
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;