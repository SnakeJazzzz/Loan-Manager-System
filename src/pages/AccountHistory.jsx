import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../utils/loanCalculations';
import { Plus, TrendingUp, TrendingDown, CreditCard, FileText, DollarSign } from 'lucide-react';

const AccountHistory = ({ transactions, onNewTransaction }) => {
  const [filter, setFilter] = useState('all'); // all, deposits, withdrawals, loans, payments

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'initial': return <DollarSign className="text-blue-500" size={20} />;
      case 'deposit': return <TrendingUp className="text-green-500" size={20} />;
      case 'withdrawal': return <TrendingDown className="text-red-500" size={20} />;
      case 'loan_out': return <CreditCard className="text-orange-500" size={20} />;
      case 'payment_in': return <FileText className="text-green-600" size={20} />;
      default: return <DollarSign className="text-gray-500" size={20} />;
    }
  };

  const getTransactionLabel = (type) => {
    switch(type) {
      case 'initial': return 'Balance Inicial';
      case 'deposit': return 'Depósito';
      case 'withdrawal': return 'Retiro';
      case 'loan_out': return 'Préstamo Otorgado';
      case 'payment_in': return 'Pago Recibido';
      default: return 'Transacción';
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'deposits') return t.transaction_type === 'deposit';
    if (filter === 'withdrawals') return t.transaction_type === 'withdrawal';
    if (filter === 'loans') return t.transaction_type === 'loan_out';
    if (filter === 'payments') return t.transaction_type === 'payment_in';
    return true;
  });

  // Calcular totales
  const totals = transactions.reduce((acc, t) => {
    if (t.transaction_type === 'initial') {
      acc.initial = t.transaction_amount;
    } else if (t.transaction_type === 'deposit' || t.transaction_type === 'payment_in') {
      acc.deposits += Math.abs(t.transaction_amount);
    } else if (t.transaction_type === 'withdrawal' || t.transaction_type === 'loan_out') {
      acc.withdrawals += Math.abs(t.transaction_amount);
    }
    return acc;
  }, { initial: 0, deposits: 0, withdrawals: 0 });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Historial de Cuenta</h2>
        <button
          onClick={onNewTransaction}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          Nueva Transacción
        </button>
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Balance Inicial</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totals.initial)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Entradas</p>
          <p className="text-xl font-bold text-green-600">+{formatCurrency(totals.deposits)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Salidas</p>
          <p className="text-xl font-bold text-red-600">-{formatCurrency(totals.withdrawals)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Balance Actual</p>
          <p className="text-xl font-bold text-gray-800">
            {formatCurrency(transactions[0]?.balance || 0)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('deposits')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'deposits' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Depósitos
        </button>
        <button
          onClick={() => setFilter('withdrawals')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'withdrawals' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Retiros
        </button>
        <button
          onClick={() => setFilter('loans')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'loans' 
              ? 'bg-orange-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Préstamos
        </button>
        <button
          onClick={() => setFilter('payments')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'payments' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pagos
        </button>
      </div>

      {/* Tabla de transacciones */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No hay transacciones para mostrar
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transaction_type)}
                        <span className="text-sm">{getTransactionLabel(transaction.transaction_type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{transaction.description}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                      transaction.transaction_amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.transaction_amount > 0 ? '+' : ''}{formatCurrency(transaction.transaction_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      {formatCurrency(transaction.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountHistory;