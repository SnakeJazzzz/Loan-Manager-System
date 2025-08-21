import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const TransactionForm = ({ onSubmit, onCancel, currentBalance, accountTransactions = [] }) => {
  const [formData, setFormData] = useState({
    type: 'deposit', // 'deposit' o 'withdrawal'
    amount: '',
    description: accountTransactions.length === 0 ? 'Balance inicial de la cuenta' : '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }

    if (!formData.description.trim()) {
      alert('Por favor ingrese una descripción');
      return;
    }

    const amount = parseFloat(formData.amount);
    
    // Validar que no se retire más del balance disponible
    if (formData.type === 'withdrawal' && amount > currentBalance) {
      alert(`Balance insuficiente. Balance actual: $${currentBalance.toFixed(2)}`);
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
        <h3 className="text-xl font-bold mb-4">
          {accountTransactions.length === 0 ? 'Establecer Balance Inicial' : 'Registrar Transacción'}
        </h3>
        
        {accountTransactions.length === 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <DollarSign className="text-blue-600 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm text-blue-800 font-medium">Balance Inicial</p>
                <p className="text-xs text-blue-600 mt-1">
                  Esta será su primera transacción y establecerá el balance inicial de su cuenta.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Tipo de Transacción</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'deposit'})}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                formData.type === 'deposit' 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <TrendingUp size={20} />
              Depósito
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'withdrawal'})}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                formData.type === 'withdrawal' 
                  ? 'border-red-500 bg-red-50 text-red-700' 
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <TrendingDown size={20} />
              Retiro
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Monto (MXN)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Descripción</label>
          <textarea
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            maxLength={200}
            placeholder="Ej: Depósito bancario, retiro para gastos operativos, etc."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
          <p className="text-xs text-gray-500 mt-1">
            {200 - formData.description.length} caracteres restantes
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Fecha</label>
          <input
            type="date"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <p className="text-sm text-gray-600">Balance actual: <span className="font-semibold">${currentBalance.toFixed(2)}</span></p>
          <p className="text-sm text-gray-600">
            Balance después: <span className={`font-semibold ${formData.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
              ${formData.amount ? (
                formData.type === 'deposit' 
                  ? (currentBalance + parseFloat(formData.amount)).toFixed(2)
                  : (currentBalance - parseFloat(formData.amount)).toFixed(2)
              ) : currentBalance.toFixed(2)}
            </span>
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Registrar Transacción
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

export default TransactionForm;