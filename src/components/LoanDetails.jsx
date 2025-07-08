// src/components/LoanDetails.jsx
import React from 'react';
import { X } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/loanCalculations';

const LoanDetails = ({ loan, payments, invoices, interestEvents, onClose }) => {
  if (!loan) return null;

  const loanPayments = payments.filter(p => p.loanId === loan.id);
  const loanInvoices = invoices.filter(i => i.loanId === loan.id);
  const loanInterestEvents = interestEvents.filter(e => e.loanId === loan.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Detalles del Préstamo #{loan.id}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Deudor</p>
            <p className="font-semibold">{loan.debtorName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estado</p>
            <p className="font-semibold">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                loan.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {loan.status === 'Open' ? 'Abierto' : 'Pagado'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Principal Original</p>
            <p className="font-semibold">{formatCurrency(loan.originalPrincipal)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Principal Restante</p>
            <p className="font-semibold">{formatCurrency(loan.remainingPrincipal)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tasa de Interés</p>
            <p className="font-semibold">{loan.interestRate}% anual</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Interés Acumulado</p>
            <p className="font-semibold">{formatCurrency(loan.accruedInterest || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fecha de Inicio</p>
            <p className="font-semibold">{formatDate(loan.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Pagado</p>
            <p className="font-semibold">
              {formatCurrency(loan.originalPrincipal - loan.remainingPrincipal)}
            </p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-semibold mb-4">Historial de Pagos</h4>
          {loanPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-left pb-2">Monto Total</th>
                    <th className="text-left pb-2">Interés Pagado</th>
                    <th className="text-left pb-2">Principal Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {loanPayments.map(payment => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-2">{formatDate(payment.date)}</td>
                      <td className="py-2">{formatCurrency(payment.totalPaid)}</td>
                      <td className="py-2">{formatCurrency(payment.interestPaid)}</td>
                      <td className="py-2">{formatCurrency(payment.principalPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No hay pagos registrados</p>
          )}
        </div>

        <div className="border-t pt-6 mt-6">
          <h4 className="font-semibold mb-4">Eventos de Interés</h4>
          {loanInterestEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-left pb-2">Días</th>
                    <th className="text-left pb-2">Principal</th>
                    <th className="text-left pb-2">Interés Generado</th>
                  </tr>
                </thead>
                <tbody>
                  {loanInterestEvents.map(event => (
                    <tr key={event.id} className="border-b">
                      <td className="py-2">{formatDate(event.date)}</td>
                      <td className="py-2">{event.days}</td>
                      <td className="py-2">{formatCurrency(event.principal)}</td>
                      <td className="py-2">{formatCurrency(event.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No hay eventos de interés registrados</p>
          )}
        </div>

        <div className="border-t pt-6 mt-6">
          <h4 className="font-semibold mb-4">Facturas Generadas</h4>
          {loanInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-left pb-2">Descripción</th>
                    <th className="text-left pb-2">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {loanInvoices.map(invoice => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-2">{formatDate(invoice.date)}</td>
                      <td className="py-2">{invoice.description}</td>
                      <td className="py-2">{formatCurrency(invoice.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No hay facturas generadas</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanDetails;