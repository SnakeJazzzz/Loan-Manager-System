// src/components/PaymentForm.jsx
import React, { useState, useEffect } from 'react';
import { formatCurrency, daysBetween, calculateInterest } from '../utils/loanCalculations';
import { AlertCircle, Calculator } from 'lucide-react';

const PaymentForm = ({ loans, onSubmit, onCancel, canAcceptPayments }) => {
  const [formData, setFormData] = useState({
    loanId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const openLoans = loans.filter(loan => loan.status === 'Open');
  const selectedLoan = openLoans.find(loan => loan.id === parseInt(formData.loanId));
  const canPaySelectedLoan = selectedLoan && canAcceptPayments(selectedLoan.id);
  
  // Calculate interest that will be added
  const [interestToCalculate, setInterestToCalculate] = useState(0);
  
  useEffect(() => {
    if (selectedLoan && formData.date) {
      const lastAccrualDate = selectedLoan.lastInterestAccrual || selectedLoan.startDate;
      const days = daysBetween(lastAccrualDate, formData.date);
      
      if (days > 0) {
        const interest = calculateInterest(selectedLoan.remainingPrincipal, selectedLoan.interestRate, days);
        setInterestToCalculate(interest);
      } else {
        setInterestToCalculate(0);
      }
    } else {
      setInterestToCalculate(0);
    }
  }, [selectedLoan, formData.date]);

  const totalInterestToPay = (selectedLoan?.accruedInterest || 0) + interestToCalculate;

  const handleSubmit = () => {
    if (!formData.loanId || !formData.amount) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    
    if (!canPaySelectedLoan) {
      alert('Debe pagar los préstamos anteriores primero');
      return;
    }
    
    onSubmit({
      ...formData,
      loanId: parseInt(formData.loanId),
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Registrar Pago</h3>
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Préstamo</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={formData.loanId}
              onChange={(e) => setFormData({...formData, loanId: e.target.value})}
            >
              <option value="">Seleccionar préstamo...</option>
              {openLoans.map(loan => {
                const canPay = canAcceptPayments(loan.id);
                return (
                  <option key={loan.id} value={loan.id} disabled={!canPay}>
                    #{loan.id} - {loan.debtorName} - {formatCurrency(loan.remainingPrincipal)} pendiente
                    {!canPay && ' (Bloqueado - pague préstamos anteriores)'}
                  </option>
                );
              })}
            </select>
          </div>
          
          {selectedLoan && !canPaySelectedLoan && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm text-red-800 font-medium">
                  Préstamo bloqueado
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Debe completar el pago de los préstamos anteriores antes de poder pagar este préstamo.
                </p>
              </div>
            </div>
          )}
          
          {selectedLoan && canPaySelectedLoan && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Calculator className="text-blue-600 flex-shrink-0" size={20} />
                <div className="w-full">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    Cálculo de Intereses
                  </p>
                  <div className="space-y-1 text-xs text-blue-700">
                    <div className="flex justify-between">
                      <span>Interés acumulado previo:</span>
                      <span className="font-medium">{formatCurrency(selectedLoan.accruedInterest || 0)}</span>
                    </div>
                    {interestToCalculate > 0 && (
                      <div className="flex justify-between">
                        <span>Interés a calcular hasta {formData.date}:</span>
                        <span className="font-medium">+{formatCurrency(interestToCalculate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-blue-300">
                      <span className="font-medium">Total interés a pagar:</span>
                      <span className="font-bold">{formatCurrency(totalInterestToPay)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    El pago se aplicará primero a los intereses ({formatCurrency(totalInterestToPay)})
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Monto del Pago (MXN)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              disabled={!canPaySelectedLoan}
            />
            {selectedLoan && canPaySelectedLoan && formData.amount && (
              <div className="mt-2 text-xs text-gray-600">
                {parseFloat(formData.amount) > totalInterestToPay && (
                  <p>• Se pagará {formatCurrency(totalInterestToPay)} de interés y {formatCurrency(parseFloat(formData.amount) - totalInterestToPay)} del principal</p>
                )}
                {parseFloat(formData.amount) <= totalInterestToPay && (
                  <p>• Todo el pago se aplicará a intereses</p>
                )}
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Fecha del Pago</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              disabled={!canPaySelectedLoan}
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!canPaySelectedLoan}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                canPaySelectedLoan 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Registrar Pago
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
    </div>
  );
};

export default PaymentForm;