// src/pages/InvoicesList.jsx
import React from 'react';
import { formatCurrency, formatDate } from '../utils/loanCalculations';

const InvoicesList = ({ invoices, loans }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Facturas</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Préstamo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No hay facturas generadas
                  </td>
                </tr>
              ) : (
                invoices.map(invoice => {
                  const loan = loans.find(l => l.id === invoice.loanId);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{invoice.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(invoice.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{loan?.debtorName || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{invoice.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{formatCurrency(invoice.amount)}</td>
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

export default InvoicesList;