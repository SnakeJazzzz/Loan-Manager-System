// src/pages/Dashboard.jsx
import React from 'react';
import { FileText, DollarSign, Calendar, Plus, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/loanCalculations';

const Dashboard = ({ loans, invoices, onNewLoan, onNewPayment, onAccrueInterest, onViewInvoices, onVerifyLoanStatuses }) => {
  const getTotalOutstandingPrincipal = () => {
    return loans
      .filter(loan => loan.status === 'Open')
      .reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
  };

  const getTotalAccruedInterest = () => {
    return loans.reduce((sum, loan) => sum + (loan.accruedInterest || 0), 0);
  };

  const activeLoans = loans.filter(l => l.status === 'Open').length;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Panel de Control</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Total Préstamos</span>
            <FileText className="text-gray-400" size={20} />
          </div>
          <p className="text-2xl font-bold">{loans.length}</p>
          <p className="text-sm text-green-600">{activeLoans} activos</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Principal Pendiente</span>
            <DollarSign className="text-gray-400" size={20} />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(getTotalOutstandingPrincipal())}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Intereses Acumulados</span>
            <Calendar className="text-gray-400" size={20} />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(getTotalAccruedInterest())}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Facturas Generadas</span>
            <FileText className="text-gray-400" size={20} />
          </div>
          <p className="text-2xl font-bold">{invoices.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={onNewLoan}
            className="flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
            Nuevo Préstamo
          </button>
          <button
            onClick={onNewPayment}
            className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition-colors"
          >
            <DollarSign size={20} />
            Registrar Pago
          </button>
          <button
            onClick={onAccrueInterest}
            className="flex items-center justify-center gap-2 bg-yellow-500 text-white px-4 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <Calendar size={20} />
            Calcular Intereses
          </button>
          <button
            onClick={onViewInvoices}
            className="flex items-center justify-center gap-2 bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-colors"
          >
            <FileText size={20} />
            Ver Facturas
          </button>
          <button
            onClick={onVerifyLoanStatuses}
            className="flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <CheckCircle size={20} />
            Verificar Estados
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;