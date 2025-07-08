// src/components/PaymentForm.jsx
import React, { useState } from 'react';
import { formatCurrency } from '../utils/loanCalculations';

const PaymentForm = ({ loans, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    loanId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const openLoans = loans.filter(loan => loan.status === 'Open');
  const selectedLoan = openLoans.find(loan => loan.id === parseInt(formData.loanId));

  const handleSubmit = () => {
    if (!formData.loanId || !formData.amount) {
      alert('Por favor complete todos los campos requeridos');
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
              {openLoans.map(loan => (
                <option key={loan.id} value={loan.id}>
                  {loan.debtorName} - {formatCurrency(loan.remainingPrincipal)} pendiente
                </option>
              ))}
            </select>
          </div>
          
          {selectedLoan && selectedLoan.accruedInterest > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Interés acumulado: {formatCurrency(selectedLoan.accruedInterest)}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                El pago se aplicará primero a los intereses
              </p>
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
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Fecha del Pago</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
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