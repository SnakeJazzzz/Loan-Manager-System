// src/pages/MonthlyInvoices.jsx
import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/loanCalculations';
import { Calendar, FileText, DollarSign, TrendingUp, Download, RefreshCw, ChevronDown, ChevronUp, Printer } from 'lucide-react';

const MonthlyInvoices = ({ monthlyInvoices, loans, interestPayments, onRegenerateInvoices }) => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  
  // Get unique years from invoices
  const availableYears = [...new Set(monthlyInvoices.map(inv => inv.year))].sort((a, b) => b - a);
  
  // Filter invoices by selected year
  const filteredInvoices = monthlyInvoices
    .filter(inv => !filterYear || inv.year === filterYear)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  
  // Calculate totals
  const totals = filteredInvoices.reduce((acc, inv) => ({
    totalAccrued: acc.totalAccrued + inv.totalAccrued,
    totalPaid: acc.totalPaid + inv.totalPaid,
    remaining: acc.remaining + inv.remaining
  }), { totalAccrued: 0, totalPaid: 0, remaining: 0 });
  
  // Get month name in Spanish
  const getMonthName = (month) => {
    const date = new Date(2025, month - 1);
    return date.toLocaleString('es-MX', { month: 'long' });
  };
  
  // Get status badge
  const getStatusBadge = (status) => {
    const colors = {
      'Paid': 'bg-green-100 text-green-800',
      'Partial': 'bg-yellow-100 text-yellow-800',
      'Pending': 'bg-red-100 text-red-800'
    };
    
    const labels = {
      'Paid': 'Pagado',
      'Partial': 'Parcial',
      'Pending': 'Pendiente'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };
  
  // Toggle invoice expansion
  const toggleInvoice = (invoiceId) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };
  
  // Export invoice as CSV
  const exportToCSV = (invoice) => {
    const headers = ['Concepto', 'Monto'];
    const data = [
      ['Factura Mensual', invoice.id],
      ['Período', `${getMonthName(invoice.month)} ${invoice.year}`],
      ['Total Generado', invoice.totalAccrued],
      ['Total Pagado', invoice.totalPaid],
      ['Pendiente', invoice.remaining],
      ['Estado', invoice.status]
    ];
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${invoice.id}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  // Print invoice
  const printInvoice = (invoice) => {
    const printContent = `
      <html>
        <head>
          <title>Factura ${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .loans { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .total { font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Factura Mensual de Intereses</h1>
            <h2>${invoice.id}</h2>
            <p>${getMonthName(invoice.month)} ${invoice.year}</p>
          </div>
          
          <div class="details">
            <div class="detail-row">
              <span>Total Interés Generado:</span>
              <span>$${invoice.totalAccrued.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span>Total Pagado:</span>
              <span>$${invoice.totalPaid.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span>Pendiente:</span>
              <span>$${invoice.remaining.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span>Estado:</span>
              <span>${invoice.status}</span>
            </div>
          </div>
          
          ${invoice.loanDetails ? `
            <div class="loans">
              <h3>Detalle por Préstamo</h3>
              <table>
                <thead>
                  <tr>
                    <th>Préstamo</th>
                    <th>Deudor</th>
                    <th>Interés</th>
                    <th>Días</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.loanDetails.map(loan => `
                    <tr>
                      <td>${loan.loanNumber}</td>
                      <td>${loan.debtorName}</td>
                      <td>$${loan.totalInterest.toFixed(2)}</td>
                      <td>${loan.daysActive}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          <div class="total">
            <p>Fecha de Generación: ${formatDate(invoice.generatedDate)}</p>
            <p>Última Actualización: ${formatDate(invoice.lastUpdated)}</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Facturas Mensuales</h2>
        <p className="text-gray-600">
          Sistema consolidado de facturación mensual de intereses
        </p>
      </div>
      
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline mr-1" size={16} />
              Filtrar por Año
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los años</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {onRegenerateInvoices && (
            <button
              onClick={onRegenerateInvoices}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Regenerar Facturas
            </button>
          )}
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Total Generado</span>
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(totals.totalAccrued)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            En {filteredInvoices.length} factura(s)
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Total Pagado</span>
            <DollarSign className="text-green-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totals.totalPaid)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {((totals.totalPaid / totals.totalAccrued) * 100).toFixed(1)}% del total
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Pendiente</span>
            <FileText className="text-red-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(totals.remaining)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Por cobrar
          </p>
        </div>
      </div>
      
      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold">Detalle de Facturas</h3>
        </div>
        
        {filteredInvoices.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No hay facturas generadas para el período seleccionado
          </div>
        ) : (
          <div className="divide-y">
            {filteredInvoices.map(invoice => (
              <div key={invoice.id} className="hover:bg-gray-50">
                {/* Invoice Summary Row */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleInvoice(invoice.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-semibold">{invoice.id}</p>
                        <p className="text-sm text-gray-500">
                          {getMonthName(invoice.month)} {invoice.year}
                        </p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Generado</p>
                        <p className="font-semibold">{formatCurrency(invoice.totalAccrued)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Pagado</p>
                        <p className="font-semibold text-green-600">{formatCurrency(invoice.totalPaid)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Pendiente</p>
                        <p className="font-semibold text-red-600">{formatCurrency(invoice.remaining)}</p>
                      </div>
                      
                      {expandedInvoice === invoice.id ? 
                        <ChevronUp size={20} /> : 
                        <ChevronDown size={20} />
                      }
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {expandedInvoice === invoice.id && (
                  <div className="px-4 pb-4 bg-gray-50">
                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          printInvoice(invoice);
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center gap-1"
                      >
                        <Printer size={14} />
                        Imprimir
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportToCSV(invoice);
                        }}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 flex items-center gap-1"
                      >
                        <Download size={14} />
                        Exportar CSV
                      </button>
                    </div>
                    
                    {/* Loan Details */}
                    {invoice.loanDetails && invoice.loanDetails.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2 text-sm">Detalle por Préstamo</h4>
                        <div className="bg-white rounded p-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left pb-2">Préstamo</th>
                                <th className="text-left pb-2">Deudor</th>
                                <th className="text-right pb-2">Interés</th>
                                <th className="text-right pb-2">Días</th>
                                <th className="text-right pb-2">Tasa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.loanDetails.map((loan, idx) => (
                                <tr key={idx} className="border-b">
                                  <td className="py-2">{loan.loanNumber}</td>
                                  <td className="py-2">{loan.debtorName}</td>
                                  <td className="py-2 text-right">{formatCurrency(loan.totalInterest)}</td>
                                  <td className="py-2 text-right">{loan.daysActive}</td>
                                  <td className="py-2 text-right">{loan.interestRate}%</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan="2" className="py-2 font-semibold">Total</td>
                                <td className="py-2 text-right font-semibold">
                                  {formatCurrency(invoice.loanDetails.reduce((sum, l) => sum + l.totalInterest, 0))}
                                </td>
                                <td colSpan="2"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* Metadata */}
                    <div className="text-xs text-gray-500">
                      <p>Generado: {formatDate(invoice.generatedDate)}</p>
                      <p>Actualizado: {formatDate(invoice.lastUpdated)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyInvoices;