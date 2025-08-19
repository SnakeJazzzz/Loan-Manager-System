// src/components/PaymentForm.jsx - VERSIÓN CORREGIDA
import React, { useState } from 'react';
import { formatCurrency } from '../utils/loanCalculations';
import { Calculator } from 'lucide-react';

const PaymentForm = ({ loans, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const openLoans = loans.filter(loan => loan.status === 'Open');
  
  // Calculate total debt across all open loans
  const totalDebt = openLoans.reduce((sum, loan) => {
    return sum + loan.remainingPrincipal + (loan.accruedInterest || 0);
  }, 0);

  const handleSubmit = () => {
    if (!formData.amount) {
      alert('Por favor ingrese el monto del pago');
      return;
    }
    
    const amount = parseFloat(formData.amount);
    
    if (amount <= 0) {
      alert('El monto debe ser mayor a cero');
      return;
    }
    
    if (amount > totalDebt) {
      alert(`El pago de ${formatCurrency(amount)} excede la deuda total de ${formatCurrency(totalDebt)}.\n\nPor favor ingrese un monto menor o igual a ${formatCurrency(totalDebt)}.`);
      return;
    }
    
    onSubmit({
      ...formData,
      amount: amount
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Registrar Pago</h3>
        <div>
          {/* Payment info card */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Calculator className="text-blue-600 flex-shrink-0" size={20} />
              <div className="w-full">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Pago Secuencial Automático
                </p>
                <div className="space-y-1 text-xs text-blue-700">
                  <p>• El pago se aplicará automáticamente a los préstamos en orden de ID</p>
                  <p>• Se pagará primero el interés, luego el principal de cada préstamo</p>
                  <p>• Si el pago excede lo adeudado, se aplicará al siguiente préstamo</p>
                </div>
                {openLoans.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-300">
                    <p className="text-xs text-blue-600 font-medium">Préstamos pendientes:</p>
                    {openLoans.slice(0, 3).map(loan => {
                      const totalOwed = loan.remainingPrincipal + (loan.accruedInterest || 0);
                      return (
                        <p key={loan.id} className="text-xs text-blue-600">
                          {loan.loanNumber || `#${loan.id}`} - {loan.debtorName}: {formatCurrency(totalOwed)}
                        </p>
                      );
                    })}
                    {openLoans.length > 3 && (
                      <p className="text-xs text-blue-600">+ {openLoans.length - 3} más...</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-blue-300">
                      <p className="text-xs text-blue-800 font-bold">
                        Deuda Total: {formatCurrency(totalDebt)}
                      </p>
                      <p className="text-xs text-blue-600">
                        Monto máximo permitido
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Monto del Pago (MXN)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="Ej: 150000"
            />
            {formData.amount && parseFloat(formData.amount) > 0 && (
              <div className="mt-2 text-xs">
                {parseFloat(formData.amount) > totalDebt ? (
                  <div className="text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    <p className="font-medium">⚠️ Monto excede la deuda total</p>
                    <p>Máximo permitido: {formatCurrency(totalDebt)}</p>
                    <p>Exceso: {formatCurrency(parseFloat(formData.amount) - totalDebt)}</p>
                  </div>
                ) : (
                  <div className="text-gray-600">
                    <p>• Se aplicará automáticamente a los préstamos en orden secuencial</p>
                    <p>• Total a pagar: {formatCurrency(parseFloat(formData.amount))}</p>
                    <p>• Restante después del pago: {formatCurrency(totalDebt - parseFloat(formData.amount))}</p>
                  </div>
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
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!formData.amount || parseFloat(formData.amount) <= 0 || parseFloat(formData.amount) > totalDebt}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                formData.amount && parseFloat(formData.amount) > 0 && parseFloat(formData.amount) <= totalDebt
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
    </div>
  );
};

export default PaymentForm;