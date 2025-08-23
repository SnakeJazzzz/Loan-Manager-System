// src/components/LoanForm.jsx
import React, { useState } from 'react';
import { generateLoanNumber, formatDate } from '../utils/loanCalculations';

const LoanForm = ({ onSubmit, onCancel, initialData = null, getNextLoanId }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    debtorName: initialData?.debtorName || '',
    amount: initialData?.amount || '',
    interestRate: initialData?.interestRate || 15,
    startDate: initialData?.startDate || today,
    destiny: initialData?.destiny || ''
  });

  // Generar preview del número de préstamo usando el ID
  const nextId = initialData ? initialData.id : getNextLoanId();
  const loanNumberPreview = initialData 
    ? initialData.loanNumber 
    : generateLoanNumber(nextId, formData.startDate);

  const handleSubmit = () => {
    // Existing validations
    if (!formData.debtorName || !formData.amount) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    
    // Add date validation
    if (!formData.startDate) {
      alert('Por favor seleccione una fecha de inicio');
      return;
    }
    
    if (formData.startDate > today) {
      alert('La fecha de inicio no puede ser futura');
      return;
    }
    
    // Check if date is too old (optional - e.g., no loans older than 5 years)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const oldestAllowedDate = fiveYearsAgo.toISOString().split('T')[0];
    
    if (formData.startDate < oldestAllowedDate) {
      const proceed = window.confirm(
        `La fecha de inicio es muy antigua (${formatDate(formData.startDate)}).\n` +
        `¿Está seguro de que desea continuar?`
      );
      if (!proceed) return;
    }
    
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      loanNumber: loanNumberPreview,
      previewId: nextId  // Pasar el ID para usarlo en createLoan
    });
  };

  const remainingChars = 200 - formData.destiny.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {initialData ? 'Editar Préstamo' : 'Nuevo Préstamo'}
        </h3>
        
        {/* Preview del número de préstamo */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">Número de préstamo:</p>
          <p className="font-semibold text-lg">{loanNumberPreview}</p>
        </div>

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
            <label className="block text-sm font-medium mb-2">Destino del Préstamo</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              maxLength={200}
              placeholder="Ej: Compra de mercancía, gastos médicos, etc."
              value={formData.destiny}
              onChange={(e) => setFormData({...formData, destiny: e.target.value})}
            />
            <p className={`text-xs mt-1 ${remainingChars < 20 ? 'text-red-500' : 'text-gray-500'}`}>
              {remainingChars} caracteres restantes
            </p>
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
              max={today} // Can't create loan with future date
            />
            {!initialData && formData.startDate !== today && (
              <p className="text-xs text-yellow-600 mt-1">
                Nota: El número de préstamo cambiará según la fecha seleccionada
              </p>
            )}
            {formData.startDate > today && (
              <p className="text-xs text-red-500 mt-1">
                La fecha de inicio no puede ser futura
              </p>
            )}
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