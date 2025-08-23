// src/components/PaymentForm.jsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { formatCurrency, calculateInterest, daysBetween, formatDate } from '../utils/loanCalculations';
import { Calculator, AlertCircle, Calendar } from 'lucide-react';

const PaymentForm = ({ loans, payments, onSubmit, onCancel }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    amount: '',
    date: today // Default to today
  });
  
  const [interestPreview, setInterestPreview] = useState({
    totalInterest: 0,
    totalPrincipal: 0,
    totalDebt: 0,
    breakdown: []
  });

  const openLoans = loans.filter(loan => loan.status === 'Open');
  
  // Find the earliest loan start date
  const earliestLoanDate = openLoans.reduce((earliest, loan) => {
    return !earliest || loan.startDate < earliest ? loan.startDate : earliest;
  }, null);
  
  // Calculate interest whenever the date changes
  useEffect(() => {
    calculateInterestPreview();
  }, [formData.date, loans, payments]);
  
  const calculateInterestPreview = () => {
    if (!formData.date || openLoans.length === 0) {
      setInterestPreview({
        totalInterest: 0,
        totalPrincipal: 0,
        totalDebt: 0,
        breakdown: []
      });
      return;
    }
    
    let totalInterest = 0;
    let totalPrincipal = 0;
    const breakdown = [];
    
    // Calculate interest for each open loan up to the payment date
    for (const loan of openLoans) {
      // Find the last payment for this loan to determine interest start date
      const lastPaymentToThisLoan = payments
        .filter(p => p.loanId === loan.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      const interestStartDate = lastPaymentToThisLoan 
        ? lastPaymentToThisLoan.date 
        : (loan.lastInterestAccrual || loan.startDate);
      
      // Calculate days from interest start to payment date
      const daysToPayment = daysBetween(interestStartDate, formData.date);
      
      let interestForThisLoan = 0;
      
      if (daysToPayment > 0 && loan.remainingPrincipal > 0) {
        interestForThisLoan = calculateInterest(
          loan.remainingPrincipal,
          loan.interestRate,
          daysToPayment
        );
      }
      
      totalInterest += interestForThisLoan;
      totalPrincipal += loan.remainingPrincipal;
      
      breakdown.push({
        loanId: loan.id,
        loanNumber: loan.loanNumber || `#${loan.id}`,
        debtorName: loan.debtorName,
        principal: loan.remainingPrincipal,
        interest: interestForThisLoan,
        days: daysToPayment,
        interestRate: loan.interestRate,
        fromDate: interestStartDate,
        toDate: formData.date
      });
    }
    
    setInterestPreview({
      totalInterest,
      totalPrincipal,
      totalDebt: totalInterest + totalPrincipal,
      breakdown
    });
  };
  
  const handleSubmit = () => {
    if (!formData.amount) {
      alert('Por favor ingrese el monto del pago');
      return;
    }
    
    // Date validation
    if (!formData.date) {
      alert('Por favor seleccione una fecha de pago');
      return;
    }
    
    if (formData.date > today) {
      alert('No se pueden registrar pagos con fecha futura');
      return;
    }
    
    if (earliestLoanDate && formData.date < earliestLoanDate) {
      alert(`La fecha no puede ser anterior al préstamo más antiguo (${formatDate(earliestLoanDate)})`);
      return;
    }
    
    const amount = parseFloat(formData.amount);
    
    if (amount <= 0) {
      alert('El monto debe ser mayor a cero');
      return;
    }
    
    if (amount > interestPreview.totalDebt) {
      alert(`El pago de ${formatCurrency(amount)} excede la deuda total de ${formatCurrency(interestPreview.totalDebt)}.`);
      return;
    }
    
    onSubmit({
      ...formData,
      amount: amount
    });
  };
  
  // Calculate how the payment will be applied
  const getPaymentAllocation = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return null;
    }
    
    const paymentAmount = parseFloat(formData.amount);
    let remaining = paymentAmount;
    const allocation = [];
    
    for (const loan of interestPreview.breakdown) {
      if (remaining <= 0) break;
      
      const totalForLoan = loan.interest + loan.principal;
      const paymentForLoan = Math.min(remaining, totalForLoan);
      
      let interestPaid = Math.min(paymentForLoan, loan.interest);
      let principalPaid = paymentForLoan - interestPaid;
      
      allocation.push({
        loanNumber: loan.loanNumber,
        debtorName: loan.debtorName,
        interestPaid,
        principalPaid,
        total: paymentForLoan
      });
      
      remaining -= paymentForLoan;
    }
    
    return allocation;
  };
  
  const paymentAllocation = getPaymentAllocation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Registrar Pago</h3>
        
        {/* Date Selection with validation */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            <Calendar className="inline mr-1" size={16} />
            Fecha del Pago
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            min={earliestLoanDate} // Can't pay before earliest loan
            max={today} // Can't pay in the future
          />
          {earliestLoanDate && formData.date < earliestLoanDate && (
            <p className="text-xs text-red-500 mt-1">
              La fecha no puede ser anterior al préstamo más antiguo ({formatDate(earliestLoanDate)})
            </p>
          )}
          {formData.date > today && (
            <p className="text-xs text-red-500 mt-1">
              No se pueden registrar pagos con fecha futura
            </p>
          )}
        </div>
        
        {/* Interest Calculation Preview */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2 mb-3">
            <Calculator className="text-blue-600 flex-shrink-0" size={20} />
            <div className="w-full">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                Cálculo de Intereses al {formData.date ? new Date(formData.date + 'T12:00:00').toLocaleDateString('es-MX') : 'fecha seleccionada'}
              </p>
              
              {interestPreview.breakdown.length > 0 ? (
                <div className="space-y-2">
                  {interestPreview.breakdown.map(loan => (
                    <div key={loan.loanId} className="text-xs border-t border-blue-200 pt-2">
                      <p className="font-medium text-blue-700">
                        {loan.loanNumber} - {loan.debtorName}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-blue-600">
                        <div>
                          <span className="text-gray-600">Principal:</span> {formatCurrency(loan.principal)}
                        </div>
                        <div>
                          <span className="text-gray-600">Tasa:</span> {loan.interestRate}% anual
                        </div>
                        <div>
                          <span className="text-gray-600">Período:</span> {loan.days} días
                        </div>
                        <div>
                          <span className="text-gray-600">Interés:</span> <strong>{formatCurrency(loan.interest)}</strong>
                        </div>
                      </div>
                      {loan.days > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Del {new Date(loan.fromDate + 'T12:00:00').toLocaleDateString('es-MX')} al {new Date(loan.toDate + 'T12:00:00').toLocaleDateString('es-MX')}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {/* Totals */}
                  <div className="border-t-2 border-blue-300 pt-2 mt-3">
                    <div className="grid grid-cols-3 gap-2 text-sm font-semibold text-blue-800">
                      <div>
                        <p className="text-xs text-gray-600">Total Principal</p>
                        <p>{formatCurrency(interestPreview.totalPrincipal)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Total Interés</p>
                        <p>{formatCurrency(interestPreview.totalInterest)}</p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded">
                        <p className="text-xs text-gray-600">Deuda Total</p>
                        <p className="text-blue-900">{formatCurrency(interestPreview.totalDebt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-blue-600">No hay préstamos abiertos</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Payment Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Monto del Pago (MXN)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={interestPreview.totalDebt}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            placeholder={`Máximo: ${formatCurrency(interestPreview.totalDebt)}`}
          />
        </div>
        
        {/* Payment Allocation Preview */}
        {paymentAllocation && paymentAllocation.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-green-600 flex-shrink-0" size={20} />
              <div className="w-full">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  Aplicación del Pago
                </p>
                <div className="space-y-1 text-xs">
                  {paymentAllocation.map((alloc, idx) => (
                    <div key={idx} className="flex justify-between text-green-700">
                      <span>{alloc.loanNumber}:</span>
                      <span>
                        Interés: {formatCurrency(alloc.interestPaid)} | 
                        Principal: {formatCurrency(alloc.principalPaid)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-green-300 pt-1 mt-2 font-semibold text-green-800">
                    <div className="flex justify-between">
                      <span>Total a Pagar:</span>
                      <span>{formatCurrency(parseFloat(formData.amount))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deuda Restante:</span>
                      <span>{formatCurrency(Math.max(0, interestPreview.totalDebt - parseFloat(formData.amount)))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Warning if overpaying */}
        {formData.amount && parseFloat(formData.amount) > interestPreview.totalDebt && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  ⚠️ Monto excede la deuda total
                </p>
                <p className="text-xs text-red-600">
                  Máximo permitido: {formatCurrency(interestPreview.totalDebt)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={
              !formData.amount || 
              !formData.date || 
              parseFloat(formData.amount) <= 0 || 
              parseFloat(formData.amount) > interestPreview.totalDebt ||
              formData.date > today ||
              (earliestLoanDate && formData.date < earliestLoanDate)
            }
            className={`flex-1 py-2 rounded-lg transition-colors ${
              formData.amount && 
              formData.date && 
              parseFloat(formData.amount) > 0 && 
              parseFloat(formData.amount) <= interestPreview.totalDebt &&
              formData.date <= today &&
              (!earliestLoanDate || formData.date >= earliestLoanDate)
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Procesar Pago
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;