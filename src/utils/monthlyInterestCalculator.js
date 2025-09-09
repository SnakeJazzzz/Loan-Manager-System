// src/utils/monthlyInterestCalculator.js - FINAL FIXED VERSION
// This version ACTUALLY uses calculateInterest everywhere

import { calculateInterest, daysBetween } from "./loanCalculations";

/**
 * Calculate monthly interest - PROPERLY USING calculateInterest
 *
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {Array} loans - All loans
 * @param {Array} payments - All payments
 * @returns {Object} Monthly calculation result
 */
export const calculateMonthlyInterest = (month, year, loans, payments) => {
  // Definir límites del mes
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;

  console.log(`=== Calculando Factura ${month}/${year} ===`);
  console.log(`Período: ${monthStart} al ${monthEnd}`);

  let totalGenerated = 0; // Interés generado EN ESTE MES
  let totalPaid = 0; // Interés pagado EN ESTE MES
  let totalPending = 0; // Interés pendiente AL FINAL DEL MES
  const loanBreakdown = [];

  // Para cada préstamo
  for (const loan of loans) {
    // Skip si el préstamo no existía en este mes
    if (loan.startDate > monthEnd) {
      console.log(`Préstamo ${loan.id}: No existía en ${month}/${year}`);
      continue;
    }

    // ========== CALCULAR INTERÉS GENERADO EN EL MES ==========

    // Fecha de inicio para el cálculo (inicio del mes o inicio del préstamo)
    const startDateForCalc =
      loan.startDate > monthStart ? loan.startDate : monthStart;

    // Si el préstamo empezó después del fin del mes, no genera interés
    if (startDateForCalc > monthEnd) {
      continue;
    }

    // CORRECCIÓN CRÍTICA: Calcular días correctamente
    // Para Julio con préstamo del 29/07: debe ser 3 días (29, 30, 31)
    let daysInMonth = 0;

    if (loan.startDate >= monthStart && loan.startDate <= monthEnd) {
      // El préstamo empezó durante este mes
      // Días = desde el inicio del préstamo hasta el fin del mes (inclusive)
      const startDate = new Date(loan.startDate);
      const endDate = new Date(monthEnd);

      // Calcular días incluyendo ambas fechas
      daysInMonth =
        Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      console.log(`Préstamo ${loan.id} empezó el ${loan.startDate}`);
      console.log(
        `Días en ${month}/${year}: desde ${loan.startDate} hasta ${monthEnd} = ${daysInMonth} días`
      );
    } else if (loan.startDate < monthStart) {
      // El préstamo empezó antes de este mes
      // Días = todos los días del mes
      daysInMonth = lastDay;
      console.log(`Préstamo ${loan.id}: Mes completo = ${daysInMonth} días`);
    }

    // Obtener pagos del préstamo
    const loanPayments = payments
      .filter((p) => p.loanId === loan.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calcular el principal al inicio del período
    let principal = loan.originalPrincipal;

    // Restar pagos al principal ANTES del período de cálculo
    const paymentsBefore = loanPayments.filter(
      (p) => p.date < startDateForCalc
    );
    for (const payment of paymentsBefore) {
      principal -= payment.principalPaid || 0;
    }

    // Si ya estaba pagado, no genera interés
    if (principal <= 0) {
      console.log(`Préstamo ${loan.id}: Ya estaba pagado`);
      continue;
    }

    // Obtener pagos DURANTE el mes
    const paymentsInMonth = loanPayments.filter(
      (p) => p.date >= monthStart && p.date <= monthEnd
    );

    // Calcular interés generado en el mes
    let interestThisMonth = 0;

    // Si no hay pagos en el mes, calcular directo con los días correctos
    if (paymentsInMonth.length === 0) {
      // USAR calculateInterest - LA FUNCIÓN QUE YA FUNCIONA BIEN
      interestThisMonth = calculateInterest(
        principal,
        loan.interestRate || 15,
        daysInMonth
      );

      console.log(
        `Cálculo usando calculateInterest: $${principal} × 15% ÷ 365 × ${daysInMonth} días = $${interestThisMonth.toFixed(
          2
        )}`
      );
    } else {
      // Si hay pagos, calcular por segmentos
      let currentDate = startDateForCalc;
      let currentPrincipal = principal;

      for (const payment of paymentsInMonth) {
        // Días desde última fecha hasta este pago
        const segmentStart = new Date(currentDate);
        const segmentEnd = new Date(payment.date);
        const segmentDays = Math.floor(
          (segmentEnd - segmentStart) / (1000 * 60 * 60 * 24)
        );

        if (segmentDays > 0 && currentPrincipal > 0) {
          // USAR calculateInterest
          const segmentInterest = calculateInterest(
            currentPrincipal,
            loan.interestRate || 15,
            segmentDays
          );
          interestThisMonth += segmentInterest;
        }

        // Actualizar principal después del pago
        currentPrincipal -= payment.principalPaid || 0;
        currentDate = payment.date;
      }

      // Calcular desde último pago hasta fin de mes
      if (currentDate < monthEnd && currentPrincipal > 0) {
        const lastSegmentStart = new Date(currentDate);
        const lastSegmentEnd = new Date(monthEnd);
        const remainingDays =
          Math.floor(
            (lastSegmentEnd - lastSegmentStart) / (1000 * 60 * 60 * 24)
          ) + 1;

        // USAR calculateInterest
        const remainingInterest = calculateInterest(
          currentPrincipal,
          loan.interestRate || 15,
          remainingDays
        );
        interestThisMonth += remainingInterest;
      }
    }

    // Agregar al total generado
    totalGenerated += interestThisMonth;

    // Agregar al desglose
    if (interestThisMonth > 0 || paymentsInMonth.length > 0) {
      loanBreakdown.push({
        loanId: loan.id,
        loanNumber: loan.loanNumber || `#${loan.id}`,
        debtorName: loan.debtorName,
        principal: principal,
        daysInMonth: daysInMonth,
        totalInterest: Math.round(interestThisMonth * 100) / 100,
        payments: paymentsInMonth.length,
      });
    }
  }

  // ========== CALCULAR INTERÉS PAGADO EN EL MES ==========
  const paymentsThisMonth = payments.filter(
    (p) => p.date >= monthStart && p.date <= monthEnd
  );

  totalPaid = paymentsThisMonth.reduce((sum, p) => {
    return sum + (p.interestPaid || 0);
  }, 0);

  console.log(
    `Pagos en ${month}/${year}: ${
      paymentsThisMonth.length
    } pagos, $${totalPaid.toFixed(2)} en intereses`
  );

  // ========== CALCULAR INTERÉS PENDIENTE ==========
  // El pendiente es el interés acumulado no pagado hasta el final del mes
  totalPending = 0;

  for (const loan of loans) {
    if (loan.startDate > monthEnd) continue;

    // Obtener todos los pagos hasta el fin del mes
    const allPaymentsToDate = payments.filter(
      (p) => p.loanId === loan.id && p.date <= monthEnd
    );

    // Calcular principal actual
    const totalPrincipalPaid = allPaymentsToDate.reduce((sum, p) => {
      return sum + (p.principalPaid || 0);
    }, 0);

    const currentPrincipal = loan.originalPrincipal - totalPrincipalPaid;

    // Si el préstamo está pagado, no hay pendiente
    if (currentPrincipal <= 0) continue;

    // Calcular interés pendiente
    const lastPayment = allPaymentsToDate.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )[0];

    if (lastPayment) {
      // Días desde el último pago hasta el fin del mes
      const lastPayDate = new Date(lastPayment.date);
      const endDate = new Date(monthEnd);
      const daysUnpaid = Math.floor(
        (endDate - lastPayDate) / (1000 * 60 * 60 * 24)
      );

      if (daysUnpaid > 0) {
        // USAR calculateInterest
        const unpaidInterest = calculateInterest(
          currentPrincipal,
          loan.interestRate || 15,
          daysUnpaid
        );
        totalPending += unpaidInterest;
      }
    } else {
      // Si no hay pagos, calcular desde el inicio hasta el fin del mes
      const startDate = new Date(
        loan.startDate > monthStart ? loan.startDate : monthStart
      );
      const endDate = new Date(monthEnd);
      const daysUnpaid =
        Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      // USAR calculateInterest
      const unpaidInterest = calculateInterest(
        loan.originalPrincipal,
        loan.interestRate || 15,
        daysUnpaid
      );
      totalPending += unpaidInterest;
    }
  }

  // Redondear resultados
  totalGenerated = Math.round(totalGenerated * 100) / 100;
  totalPaid = Math.round(totalPaid * 100) / 100;
  totalPending = Math.round(totalPending * 100) / 100;

  console.log(`=== Resumen ${month}/${year} ===`);
  console.log(`Generado: $${totalGenerated}`);
  console.log(`Pagado: $${totalPaid}`);
  console.log(`Pendiente: $${totalPending}`);

  // Retornar resultado
  return {
    month,
    year,
    monthStart,
    monthEnd,

    // Los 3 valores clave
    totalAccrued: totalGenerated, // Interés generado EN EL MES
    totalPaid: totalPaid, // Interés pagado EN EL MES
    remaining: totalPending, // Interés pendiente AL FIN DEL MES

    // Detalles
    loanBreakdown,
    paymentsInMonth: paymentsThisMonth,

    // Estado de la factura
    status: totalPending <= 0.01 ? "Pagado" : "Pendiente",
  };
};

/**
 * Test manual para verificar el cálculo
 */
export const testJulyCalculation = () => {
  // Test directo sin usar daysBetween
  const principal = 450000;
  const rate = 15;
  const daysInJuly = 3; // 29, 30, 31 de julio

  // Usar calculateInterest para el test también
  const interest = calculateInterest(principal, rate, daysInJuly);

  console.log("=== Test Manual Julio 2025 ===");
  console.log(`Principal: $${principal}`);
  console.log(`Tasa: ${rate}%`);
  console.log(`Días: ${daysInJuly} (29, 30, 31 de julio)`);
  console.log(`Resultado usando calculateInterest: $${interest.toFixed(2)}`);
  console.log(`Esperado: $369.86`);

  return interest;
};

/**
 * Calculate all historical interest
 */
export const calculateAllHistoricalInterest = (loans, payments) => {
  if (!loans || loans.length === 0) {
    return {
      totalAccrued: 0,
      totalPaid: 0,
      totalRemaining: 0,
      breakdown: [],
    };
  }

  const earliestLoan = loans.reduce(
    (earliest, loan) =>
      !earliest || loan.startDate < earliest.startDate ? loan : earliest,
    null
  );

  if (!earliestLoan) {
    return { totalAccrued: 0, totalPaid: 0, totalRemaining: 0, breakdown: [] };
  }

  const [startYear, startMonth] = earliestLoan.startDate.split("-").map(Number);
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  let totalAccrued = 0;
  let totalPaid = 0;
  const breakdown = [];

  let currentMonth = startMonth;
  let currentYear = startYear;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const monthlyResult = calculateMonthlyInterest(
      currentMonth,
      currentYear,
      loans,
      payments
    );

    totalAccrued += monthlyResult.totalAccrued;
    totalPaid += monthlyResult.totalPaid;

    breakdown.push({
      month: currentMonth,
      year: currentYear,
      accrued: monthlyResult.totalAccrued,
      paid: monthlyResult.totalPaid,
      remaining: monthlyResult.remaining,
      status: monthlyResult.status,
    });

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  const lastMonth = breakdown[breakdown.length - 1];
  const totalRemaining = lastMonth ? lastMonth.remaining : 0;

  return {
    totalAccrued: Math.round(totalAccrued * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalRemaining: Math.round(totalRemaining * 100) / 100,
    breakdown,
  };
};

export default {
  calculateMonthlyInterest,
  calculateAllHistoricalInterest,
  testJulyCalculation,
};
