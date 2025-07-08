// src/pages/PaymentsList.jsx
import React, { useState } from 'react';
import { Trash2, Filter } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/loanCalculations';

const PaymentsList = ({ payments, loans, onDeletePayment }) => {
  const [filterLoanId, setFilterLoanId] = useState('');
  
  // Filter payments by loan if selected
  const filteredPayments = filterLoanId 
    ? payments.filter(p => p.loanId === parseInt(filterLoanId))
    : payments;
  
  // Sort by date descending (newest first)
  const sortedPayments = [...filteredPayments].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Historial de Pagos</h2>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-500" />
          <select
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterLoanId}
            onChange={(e) => setFilterLoanId(e.target.value)}
          >
            <option value="">Todos los préstamos</option>
            {loans.map(loan => (
              <option key={loan.id} value={loan.id}>
                Préstamo #{loan.id} - {loan.debtorName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Préstamo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interés Pagado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal Pagado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No hay pagos registrados
                  </td>
                </tr>
              ) : (
                sortedPayments.map(payment => {
                  const loan = loans.find(l => l.id === payment.loanId);
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(payment.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        #{payment.loanId} - {loan?.debtorName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {formatCurrency(payment.totalPaid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(payment.interestPaid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(payment.principalPaid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => onDeletePayment(payment.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar pago"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {sortedPayments.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Resumen de Pagos</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total Pagado</p>
              <p className="font-bold">{formatCurrency(
                sortedPayments.reduce((sum, p) => sum + p.totalPaid, 0)
              )}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Intereses</p>
              <p className="font-bold">{formatCurrency(
                sortedPayments.reduce((sum, p) => sum + p.interestPaid, 0)
              )}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Principal</p>
              <p className="font-bold">{formatCurrency(
                sortedPayments.reduce((sum, p) => sum + p.principalPaid, 0)
              )}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsList;