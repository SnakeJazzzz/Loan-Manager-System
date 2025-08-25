// src/pages/InterestPayments.jsx
import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../utils/loanCalculations';
import { Calendar, DollarSign, FileText, Filter } from 'lucide-react';

const InterestPayments = ({ interestPayments, loans }) => {
  const [filterLoan, setFilterLoan] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  
  // Filter payments based on selections
  const filteredPayments = interestPayments.filter(payment => {
    if (filterLoan !== 'all' && payment.loanId !== parseInt(filterLoan)) {
      return false;
    }
    if (filterMonth && !payment.date.startsWith(filterMonth)) {
      return false;
    }
    return true;
  });
  
  // Calculate totals
  const totalInterestPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Group by month for summary
  const monthlyTotals = filteredPayments.reduce((acc, payment) => {
    const monthKey = payment.date.substring(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = 0;
    }
    acc[monthKey] += payment.amount;
    return acc;
  }, {});

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Pagos de Intereses</h2>
        <p className="text-gray-600">
          Registro detallado de todos los pagos de intereses realizados
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline mr-1" size={16} />
              Filtrar por Préstamo
            </label>
            <select
              value={filterLoan}
              onChange={(e) => setFilterLoan(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los préstamos</option>
              {loans.map(loan => (
                <option key={loan.id} value={loan.id}>
                  {loan.loanNumber || `#${loan.id}`} - {loan.debtorName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline mr-1" size={16} />
              Filtrar por Mes
            </label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={() => {
              setFilterLoan('all');
              setFilterMonth('');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Filter className="inline mr-1" size={16} />
            Limpiar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Total Pagado</span>
            <DollarSign className="text-green-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalInterestPaid)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            En {filteredPayments.length} pago(s)
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Meses con Pagos</span>
            <Calendar className="text-blue-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {Object.keys(monthlyTotals).length}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Promedio Mensual</span>
            <DollarSign className="text-purple-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {Object.keys(monthlyTotals).length > 0 
              ? formatCurrency(totalInterestPaid / Object.keys(monthlyTotals).length)
              : '0.00'
            }
          </p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold">Detalle de Pagos de Intereses</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Préstamo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No hay pagos de intereses registrados
                  </td>
                </tr>
              ) : (
                filteredPayments.map(payment => {
                  const loan = loans.find(l => l.id === payment.loanId);
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(payment.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <p className="font-medium">{loan?.loanNumber || `#${payment.loanId}`}</p>
                          <p className="text-xs text-gray-500">{loan?.debtorName || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {payment.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {payment.type || 'interest'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Monthly Summary */}
        {Object.keys(monthlyTotals).length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <h4 className="font-semibold mb-2">Resumen por Mes</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(monthlyTotals)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([month, total]) => (
                  <div key={month} className="text-sm">
                    <span className="text-gray-600">{month}: </span>
                    <span className="font-semibold">{formatCurrency(total)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterestPayments;