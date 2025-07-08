// src/pages/LoansList.jsx
import React from 'react';
import { Plus, Trash2, Eye, Edit, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/loanCalculations';

const LoansList = ({ loans, onNewLoan, onDeleteLoan, onEditLoan, onViewLoan }) => {
  // Sort loans by ID
  const sortedLoans = [...loans].sort((a, b) => a.id - b.id);
  
  // Find the first unpaid loan
  const firstUnpaidLoan = sortedLoans.find(loan => loan.status === 'Open');
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Préstamos</h2>
        <button
          onClick={onNewLoan}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          Nuevo Préstamo
        </button>
      </div>

      {firstUnpaidLoan && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm text-blue-800">
              <strong>Préstamo activo:</strong> #{firstUnpaidLoan.id} - {firstUnpaidLoan.debtorName}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Los pagos solo se pueden aplicar a este préstamo hasta que sea completamente pagado.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
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
              {sortedLoans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No hay préstamos registrados
                  </td>
                </tr>
              ) : (
                sortedLoans.map(loan => {
                  const isCurrentLoan = firstUnpaidLoan && loan.id === firstUnpaidLoan.id;
                  return (
                    <tr key={loan.id} className={`hover:bg-gray-50 ${isCurrentLoan ? 'bg-green-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">#{loan.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{loan.debtorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(loan.originalPrincipal)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(loan.remainingPrincipal)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(loan.accruedInterest || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          loan.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {loan.status === 'Open' ? 'Abierto' : 'Pagado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onViewLoan(loan)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalles"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => onEditLoan(loan)}
                            className="text-green-600 hover:text-green-900"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => onDeleteLoan(loan.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LoansList;