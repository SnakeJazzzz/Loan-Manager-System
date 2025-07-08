// src/components/LoanForm.jsx
import React, { useState } from 'react';

const LoanForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    debtorName: initialData?.debtorName || '',
    amount: initialData?.amount || '',
    interestRate: initialData?.interestRate || 15,
    startDate: initialData?.startDate || new Date().toISOString().split('T')[0]
  });

  const handleSubmit = () => {
    if (!formData.debtorName || !formData.amount) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">
          {initialData ? 'Editar Préstamo' : 'Nuevo Préstamo'}
        </h3>
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Nombre del Deudor</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Tasa de Interés Anual (%)</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.interestRate}
              onChange={(e) => setFormData({...formData, interestRate: parseFloat(e.target.value)})}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Fecha de Inicio</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              {initialData ? 'Actualizar' : 'Crear'} Préstamo
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

export default LoanForm;