import React, { useState, useEffect } from 'react';
import { PayrollCalculation, Employee } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { MessageCircle, Send, Download, FileText, User, Users } from 'lucide-react';

interface PayrollPreviewProps {
  monthlyPayrolls: Record<string, PayrollCalculation[]>;
  employees: Employee[];
}

export const PayrollPreview: React.FC<PayrollPreviewProps> = ({ monthlyPayrolls, employees }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [showPayslips, setShowPayslips] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [reportType, setReportType] = useState<'individual' | 'general'>('individual');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [reportData, setReportData] = useState<any>(null);

  const availableMonths = Object.keys(monthlyPayrolls).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const sendWhatsAppMessage = (phone: string, message: string) => {
    if (!phone) {
      alert('El empleado no tiene número de teléfono registrado');
      return;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('57')) {
      cleanPhone = '57' + cleanPhone;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const generatePayslipMessage = (payroll: PayrollCalculation, employee: Employee) => {
    const monthYear = new Date(selectedMonth).toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });

    return `🧾 *DESPRENDIBLE DE NÓMINA*
📅 *${monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}*

👤 *${employee.name}*
🆔 C.C. ${employee.id}

💰 *DEVENGADO:*
• Salario Base: ${formatCurrency(payroll.baseSalary)}
• Días Trabajados: ${payroll.workedDays}/30
• Salario Mes: ${formatCurrency(payroll.monthlySalary)}
• Aux. Transporte: ${formatCurrency(payroll.transportAllowance)}
${payroll.additions.map(add => `• ${add.concept}: ${formatCurrency(add.amount)}`).join('\n')}
*Total Devengado: ${formatCurrency(payroll.totalEarned)}*

📉 *DEDUCCIONES:*
• Salud: ${formatCurrency(payroll.healthDeduction)}
• Pensión: ${formatCurrency(payroll.pensionDeduction)}
${payroll.deductions.map(ded => `• ${ded.concept}: ${formatCurrency(ded.amount)}`).join('\n')}
*Total Deducciones: ${formatCurrency(payroll.totalDeductions)}*

💵 *NETO A PAGAR: ${formatCurrency(payroll.netSalary)}*

📱 Droguerías Popular
Sistema de Nómina Web`;
  };

  const sendAllPayslips = async () => {
    const payrolls = monthlyPayrolls[selectedMonth] || [];
    if (payrolls.length === 0) {
      alert('No hay desprendibles para enviar en este mes');
      return;
    }

    let sentCount = 0;
    for (const payroll of payrolls) {
      const employee = employees.find(emp => emp.id === payroll.employeeId);
      if (employee && employee.phone) {
        const message = generatePayslipMessage(payroll, employee);
        sendWhatsAppMessage(employee.phone, message);
        sentCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    alert(`Se enviaron ${sentCount} desprendibles por WhatsApp`);
  };

  const generateReport = () => {
    if (!dateFrom || !dateTo) {
      alert('Selecciona el rango de fechas');
      return;
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const monthsInRange: string[] = [];

    for (let d = new Date(fromDate); d <= toDate; d.setMonth(d.getMonth() + 1)) {
      const monthKey = d.toISOString().slice(0, 7);
      if (monthlyPayrolls[monthKey]) {
        monthsInRange.push(monthKey);
      }
    }

    if (reportType === 'individual') {
      if (!selectedEmployee) {
        alert('Selecciona un empleado');
        return;
      }
      generateIndividualReport(monthsInRange);
    } else {
      generateGeneralReport(monthsInRange);
    }
  };

  const generateIndividualReport = (months: string[]) => {
    const employee = employees.find(emp => emp.id === selectedEmployee);
    if (!employee) return;

    let totalData = {
      workedDays: 0,
      baseSalary: 0,
      monthlySalary: 0,
      transportAllowance: 0,
      totalAdditions: 0,
      totalEarned: 0,
      healthDeduction: 0,
      pensionDeduction: 0,
      totalOtherDeductions: 0,
      totalDeductions: 0,
      netSalary: 0
    };

    const monthlyDetails: any[] = [];

    months.forEach(month => {
      const payroll = monthlyPayrolls[month]?.find(p => p.employeeId === selectedEmployee);
      if (payroll) {
        const otherDeductions = payroll.deductions.reduce((sum, ded) => sum + ded.amount, 0);
        const additions = payroll.additions.reduce((sum, add) => sum + add.amount, 0);

        totalData.workedDays += payroll.workedDays;
        totalData.baseSalary += payroll.baseSalary;
        totalData.monthlySalary += payroll.monthlySalary;
        totalData.transportAllowance += payroll.transportAllowance;
        totalData.totalAdditions += additions;
        totalData.totalEarned += payroll.totalEarned;
        totalData.healthDeduction += payroll.healthDeduction;
        totalData.pensionDeduction += payroll.pensionDeduction;
        totalData.totalOtherDeductions += otherDeductions;
        totalData.totalDeductions += payroll.totalDeductions;
        totalData.netSalary += payroll.netSalary;

        monthlyDetails.push({
          month,
          ...payroll,
          additions,
          otherDeductions
        });
      }
    });

    setReportData({
      type: 'individual',
      employee,
      totalData,
      monthlyDetails,
      period: `${dateFrom} a ${dateTo}`
    });
  };

  const generateGeneralReport = (months: string[]) => {
    let totalData = {
      employees: 0,
      workedDays: 0,
      baseSalary: 0,
      monthlySalary: 0,
      transportAllowance: 0,
      totalAdditions: 0,
      totalEarned: 0,
      healthDeduction: 0,
      pensionDeduction: 0,
      totalOtherDeductions: 0,
      totalDeductions: 0,
      netSalary: 0
    };

    const monthlyDetails: any[] = [];

    months.forEach(month => {
      const payrolls = monthlyPayrolls[month] || [];
      let monthData = {
        month,
        employees: payrolls.length,
        workedDays: 0,
        baseSalary: 0,
        monthlySalary: 0,
        transportAllowance: 0,
        totalAdditions: 0,
        totalEarned: 0,
        healthDeduction: 0,
        pensionDeduction: 0,
        totalOtherDeductions: 0,
        totalDeductions: 0,
        netSalary: 0
      };

      payrolls.forEach(payroll => {
        const additions = payroll.additions.reduce((sum, add) => sum + add.amount, 0);
        const otherDeductions = payroll.deductions.reduce((sum, ded) => sum + ded.amount, 0);

        monthData.workedDays += payroll.workedDays;
        monthData.baseSalary += payroll.baseSalary;
        monthData.monthlySalary += payroll.monthlySalary;
        monthData.transportAllowance += payroll.transportAllowance;
        monthData.totalAdditions += additions;
        monthData.totalEarned += payroll.totalEarned;
        monthData.healthDeduction += payroll.healthDeduction;
        monthData.pensionDeduction += payroll.pensionDeduction;
        monthData.totalOtherDeductions += otherDeductions;
        monthData.totalDeductions += payroll.totalDeductions;
        monthData.netSalary += payroll.netSalary;
      });

      totalData.employees += monthData.employees;
      totalData.workedDays += monthData.workedDays;
      totalData.baseSalary += monthData.baseSalary;
      totalData.monthlySalary += monthData.monthlySalary;
      totalData.transportAllowance += monthData.transportAllowance;
      totalData.totalAdditions += monthData.totalAdditions;
      totalData.totalEarned += monthData.totalEarned;
      totalData.healthDeduction += monthData.healthDeduction;
      totalData.pensionDeduction += monthData.pensionDeduction;
      totalData.totalOtherDeductions += monthData.totalOtherDeductions;
      totalData.totalDeductions += monthData.totalDeductions;
      totalData.netSalary += monthData.netSalary;

      monthlyDetails.push(monthData);
    });

    setReportData({
      type: 'general',
      totalData,
      monthlyDetails,
      period: `${dateFrom} a ${dateTo}`
    });
  };

  const exportReport = () => {
    if (!reportData) return;

    let content = '';
    
    if (reportData.type === 'individual') {
      content = `REPORTE INDIVIDUAL DE EMPLEADO
Período: ${reportData.period}
Empleado: ${reportData.employee.name}
Cédula: ${reportData.employee.id}

RESUMEN ACUMULADO:
Días Trabajados: ${reportData.totalData.workedDays}
Base Salarial Total: ${formatCurrency(reportData.totalData.baseSalary)}
Salario Mes Total: ${formatCurrency(reportData.totalData.monthlySalary)}
Auxilio Transporte Total: ${formatCurrency(reportData.totalData.transportAllowance)}
Bonificaciones Total: ${formatCurrency(reportData.totalData.totalAdditions)}
Total Devengado: ${formatCurrency(reportData.totalData.totalEarned)}

Salud Total: ${formatCurrency(reportData.totalData.healthDeduction)}
Pensión Total: ${formatCurrency(reportData.totalData.pensionDeduction)}
Otras Deducciones: ${formatCurrency(reportData.totalData.totalOtherDeductions)}
Total Deducciones: ${formatCurrency(reportData.totalData.totalDeductions)}

NETO TOTAL: ${formatCurrency(reportData.totalData.netSalary)}

DETALLE MES A MES:
${reportData.monthlyDetails.map((detail: any) => `
Mes: ${detail.month}
Días: ${detail.workedDays}
Salario: ${formatCurrency(detail.monthlySalary)}
Aux. Transporte: ${formatCurrency(detail.transportAllowance)}
Bonificaciones: ${formatCurrency(detail.additions)}
Devengado: ${formatCurrency(detail.totalEarned)}
Deducciones: ${formatCurrency(detail.totalDeductions)}
Neto: ${formatCurrency(detail.netSalary)}
`).join('\n')}`;
    } else {
      content = `REPORTE GENERAL DE NÓMINA
Período: ${reportData.period}

RESUMEN CONSOLIDADO:
Total Empleados: ${reportData.totalData.employees}
Días Trabajados Total: ${reportData.totalData.workedDays}
Base Salarial Total: ${formatCurrency(reportData.totalData.baseSalary)}
Salarios Pagados: ${formatCurrency(reportData.totalData.monthlySalary)}
Auxilios Transporte: ${formatCurrency(reportData.totalData.transportAllowance)}
Bonificaciones Total: ${formatCurrency(reportData.totalData.totalAdditions)}
Total Devengado: ${formatCurrency(reportData.totalData.totalEarned)}

Salud Total: ${formatCurrency(reportData.totalData.healthDeduction)}
Pensión Total: ${formatCurrency(reportData.totalData.pensionDeduction)}
Otras Deducciones: ${formatCurrency(reportData.totalData.totalOtherDeductions)}
Total Deducciones: ${formatCurrency(reportData.totalData.totalDeductions)}

NETO TOTAL PAGADO: ${formatCurrency(reportData.totalData.netSalary)}

DETALLE MES A MES:
${reportData.monthlyDetails.map((detail: any) => `
Mes: ${detail.month}
Empleados: ${detail.employees}
Días Total: ${detail.workedDays}
Salarios: ${formatCurrency(detail.monthlySalary)}
Aux. Transporte: ${formatCurrency(detail.transportAllowance)}
Bonificaciones: ${formatCurrency(detail.totalAdditions)}
Devengado: ${formatCurrency(detail.totalEarned)}
Deducciones: ${formatCurrency(detail.totalDeductions)}
Neto: ${formatCurrency(detail.netSalary)}
`).join('\n')}`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${reportData.type}_${reportData.period.replace(/\s/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (availableMonths.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay nóminas calculadas</h3>
        <p className="mt-1 text-sm text-gray-500">
          Calcula algunas nóminas primero para poder previsualizarlas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Previsualización de Nómina</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Mes a Visualizar:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            >
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {new Date(month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setShowPayslips(!showPayslips)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FileText className="w-4 h-4 mr-2" />
            Ver Desprendibles
          </button>
          
          <button
            onClick={() => setShowReports(!showReports)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generar Reporte
          </button>
        </div>
      </div>

      {/* Current Month Display */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-indigo-600 mr-2" />
          <span className="text-sm font-medium text-indigo-800">
            Visualizando: {new Date(selectedMonth).toLocaleDateString('es-ES', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </span>
        </div>
      </div>

      {/* Payslips Section */}
      {showPayslips && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Desprendibles del Mes</h3>
            <button
              onClick={sendAllPayslips}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar Todos por WhatsApp
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(monthlyPayrolls[selectedMonth] || []).map((payroll) => {
              const employee = employees.find(emp => emp.id === payroll.employeeId);
              if (!employee) return null;

              return (
                <div key={payroll.employeeId} className="bg-white overflow-hidden shadow rounded-lg border">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">{employee.name}</h4>
                      <button
                        onClick={() => sendWhatsAppMessage(employee.phone, generatePayslipMessage(payroll, employee))}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        WhatsApp
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">C.C. {employee.id}</p>
                        <p className="text-sm text-gray-500">Días trabajados: {payroll.workedDays}/30</p>
                      </div>
                      
                      <div className="border-t pt-3">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Devengado</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Salario Base:</span>
                            <span>{formatCurrency(payroll.baseSalary)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Salario Mes:</span>
                            <span>{formatCurrency(payroll.monthlySalary)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Aux. Transporte:</span>
                            <span>{formatCurrency(payroll.transportAllowance)}</span>
                          </div>
                          {payroll.additions.map((addition, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{addition.concept}:</span>
                              <span>{formatCurrency(addition.amount)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-medium text-green-600 border-t pt-1">
                            <span>Total Devengado:</span>
                            <span>{formatCurrency(payroll.totalEarned)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Deducciones</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Salud:</span>
                            <span>{formatCurrency(payroll.healthDeduction)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pensión:</span>
                            <span>{formatCurrency(payroll.pensionDeduction)}</span>
                          </div>
                          {payroll.deductions.map((deduction, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{deduction.concept}:</span>
                              <span>{formatCurrency(deduction.amount)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-medium text-red-600 border-t pt-1">
                            <span>Total Deducciones:</span>
                            <span>{formatCurrency(payroll.totalDeductions)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between text-lg font-bold text-blue-600">
                          <span>Neto a Pagar:</span>
                          <span>{formatCurrency(payroll.netSalary)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports Section */}
      {showReports && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración del Reporte</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reporte</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'individual' | 'general')}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="individual">Individual</option>
                  <option value="general">General</option>
                </select>
              </div>
              
              {reportType === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar empleado</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                <input
                  type="month"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                <input
                  type="month"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={generateReport}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generar Reporte
              </button>
              
              {reportData && (
                <button
                  onClick={exportReport}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar TXT
                </button>
              )}
            </div>
          </div>

          {/* Report Results */}
          {reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold">+</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">Total Devengado</p>
                      <p className="text-lg font-bold text-green-900">
                        {formatCurrency(reportData.totalData.totalEarned)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-bold">-</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">Total Deducciones</p>
                      <p className="text-lg font-bold text-red-900">
                        {formatCurrency(reportData.totalData.totalDeductions)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">=</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">Neto Total</p>
                      <p className="text-lg font-bold text-blue-900">
                        {formatCurrency(reportData.totalData.netSalary)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Summary */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center mb-4">
                  {reportData.type === 'individual' ? (
                    <User className="h-5 w-5 text-indigo-600 mr-2" />
                  ) : (
                    <Users className="h-5 w-5 text-indigo-600 mr-2" />
                  )}
                  <h4 className="text-lg font-medium text-gray-900">
                    {reportData.type === 'individual' 
                      ? `Resumen Individual - ${reportData.employee.name}`
                      : 'Resumen General de Nómina'
                    }
                  </h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {reportData.type === 'general' && (
                    <div>
                      <p className="text-gray-500">Total Empleados</p>
                      <p className="font-medium">{reportData.totalData.employees}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Días Trabajados</p>
                    <p className="font-medium">{reportData.totalData.workedDays}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Base Salarial</p>
                    <p className="font-medium">{formatCurrency(reportData.totalData.baseSalary)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Salarios Mes</p>
                    <p className="font-medium">{formatCurrency(reportData.totalData.monthlySalary)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Aux. Transporte</p>
                    <p className="font-medium">{formatCurrency(reportData.totalData.transportAllowance)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Bonificaciones</p>
                    <p className="font-medium">{formatCurrency(reportData.totalData.totalAdditions)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Salud</p>
                    <p className="font-medium">{formatCurrency(reportData.totalData.healthDeduction)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pensión</p>
                    <p className="font-medium">{formatCurrency(reportData.totalData.pensionDeduction)}</p>
                  </div>
                </div>
              </div>

              {/* Monthly Details Table */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900">Detalle Mes a Mes</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mes
                        </th>
                        {reportData.type === 'general' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Empleados
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Días
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Salario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aux. Transporte
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bonificaciones
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Devengado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Deducciones
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Neto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.monthlyDetails.map((detail: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(detail.month).toLocaleDateString('es-ES', { 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </td>
                          {reportData.type === 'general' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {detail.employees}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {detail.workedDays}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(detail.monthlySalary)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(detail.transportAllowance)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(detail.additions || detail.totalAdditions)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            {formatCurrency(detail.totalEarned)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                            {formatCurrency(detail.totalDeductions)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">
                            {formatCurrency(detail.netSalary)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};