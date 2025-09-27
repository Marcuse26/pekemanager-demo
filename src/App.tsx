// Contenido para: src/App.tsx
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import {
    Users, Clock, FileText, DollarSign, UserPlus, LogOut,
    Calendar as CalendarIcon, Briefcase, BarChart2, UserCheck,
    Settings as SettingsIcon, History, HelpCircle
} from 'lucide-react';

import { styles } from './styles';
import { convertToCSV, downloadCSV } from './utils/csvHelper';
import { useAppContext } from './context/AppContext';
import type { Student, Invoice, StaffTimeLog, NotificationMessage, StudentFormData, Document, Penalty, Attendance, AppHistoryLog, Config } from './types';

import { MiPequenoRecreoLogo } from './components/common/Logos';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Notification } from './components/common/Notification';
import { ConfirmModal } from './components/common/ConfirmModal';
import LoginScreen from './components/LoginScreen';
import StaffControlPanel from './components/StaffControlPanel';
import StudentDetailModal from './components/modals/StudentDetailModal';
import StudentPersonalCalendar from './components/modals/StudentPersonalCalendar';
import Dashboard from './components/tabs/Dashboard';
import NewStudentForm from './components/tabs/NewStudentForm';
import StudentList from './components/tabs/StudentList';
import AttendanceManager from './components/tabs/AttendanceManager';
import CalendarView from './components/tabs/CalendarView';
import Invoicing from './components/tabs/Invoicing';
import PenaltiesViewer from './components/tabs/PenaltiesViewer';
import StaffLogViewer from './components/tabs/StaffLogViewer';
import AppHistoryViewer from './components/tabs/AppHistoryViewer';
import Settings from './components/tabs/Settings';
import Help from './components/tabs/Help';

const App = () => {
  const { 
    students, attendance, invoices, penalties, config, schedules, staffTimeLogs, appHistory, isLoading, 
    addAppHistoryLog, addChild, deleteChild, updateStudent, addDocument, saveAttendance, 
    updateInvoiceStatus, deleteInvoice, updatePenalty, deletePenalty, saveConfig, 
    staffCheckIn, staffCheckOut, updateStaffTimeLog 
  } = useAppContext();
  
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('isLoggedIn') === 'true');
  const [currentUser, setCurrentUser] = useState<string>(() => sessionStorage.getItem('currentUser') || 'invitado');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [viewingCalendarForStudent, setViewingCalendarForStudent] = useState<Student | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  const [childForm, setChildForm] = useState<StudentFormData>({ name: '', surname: '', birthDate: '', address: '', fatherName: '', motherName: '', phone1: '', phone2: '', parentEmail: '', schedule: '', allergies: '', authorizedPickup: '', enrollmentPaid: false, monthlyPayment: true, paymentMethod: '', accountHolderName: '', nif: '', startMonth: '', plannedEndMonth: '', extendedSchedule: false });

  useEffect(() => {
      if(selectedChild) {
          const freshStudentData = students.find(c => c.id === selectedChild.id);
          setSelectedChild(freshStudentData || null);
      }
  }, [students, selectedChild]);

  const addNotification = (message: string) => { setNotifications(prev => [...prev, { id: Date.now(), message }]); };
  
  const handleLogin = (username: string) => {
    setIsLoggedIn(true);
    setCurrentUser(username);
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('currentUser', username);
    addAppHistoryLog(username, 'Inicio de Sesión', `El usuario ${username} ha iniciado sesión.`);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    addAppHistoryLog(currentUser, 'Cierre de Sesión', `El usuario ${currentUser} ha cerrado sesión.`);
    setIsLoggedIn(false);
    setCurrentUser('invitado');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('currentUser');
  };
  
  const handleAddChild = async (e: React.FormEvent) => {
      e.preventDefault();
      const success = await addChild(childForm, currentUser);
      if (success) {
        setChildForm({ name: '', surname: '', birthDate: '', address: '', fatherName: '', motherName: '', phone1: '', phone2: '', parentEmail: '', schedule: '', allergies: '', authorizedPickup: '', enrollmentPaid: false, monthlyPayment: true, paymentMethod: '', accountHolderName: '', nif: '', startMonth: '', plannedEndMonth: '', extendedSchedule: false });
        addNotification(`Alumno ${childForm.name} inscrito con éxito.`);
        setActiveTab('alumnos');
      } else {
        addNotification("Error al inscribir alumno.");
      }
  };
  
  const handleDeleteChild = (childId: string, name: string) => {
      const onConfirmDelete = async () => {
          await deleteChild(childId, name, currentUser);
          addNotification('Alumno eliminado.');
          setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
          setSelectedChild(null);
      };
      setConfirmModal({ isOpen: true, message: `¿Estás seguro de que quieres eliminar a ${name}? Esta acción no se puede deshacer.`, onConfirm: onConfirmDelete });
  };
  
  const handleUpdateStudent = async (studentId: string, updatedData: Partial<Omit<Student, 'id'>>, user: string) => {
      await updateStudent(studentId, updatedData, user);
      addNotification(`Ficha de ${updatedData.name || ''} guardada.`);
  };
  
  const handleAddDocument = async (studentId: string, documentData: Document, user: string) => {
      await addDocument(studentId, documentData, user);
      addNotification(`Documento '${documentData.name}' añadido.`);
  };

  const handleSaveAttendance = async (data: Omit<Attendance, 'id'>) => {
      await saveAttendance(data, currentUser);
      addNotification(`Asistencia de ${data.childName} guardada.`);
  };
  
  const handleDeleteInvoice = (invoice: Invoice) => {
      const onConfirmDelete = async () => {
          await deleteInvoice(invoice, currentUser);
          addNotification(`Factura de ${invoice.childName} eliminada.`);
          setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
      };
      setConfirmModal({ isOpen: true, message: `¿Estás seguro de que quieres eliminar esta factura de ${invoice.amount}${config.currency} para ${invoice.childName}?`, onConfirm: onConfirmDelete });
  };
  
  const handleUpdatePenalty = async (penaltyId: string, updates: Partial<Omit<Penalty, 'id'>>) => {
      await updatePenalty(penaltyId, updates, currentUser);
      addNotification("Penalización actualizada.");
  };

  const handleDeletePenalty = async (penaltyId: string) => {
      await deletePenalty(penaltyId, currentUser);
      addNotification("Penalización eliminada.");
  };
  
  const handleSaveConfig = async (newConfig: Config) => {
      await saveConfig(newConfig);
      addNotification("Configuración guardada.");
  };
  
  const handleStaffCheckIn = async () => {
      await staffCheckIn(currentUser);
      addNotification(`Entrada registrada.`);
  };
  
  const handleStaffCheckOut = async () => {
      await staffCheckOut(currentUser);
      addNotification(`Salida registrada.`);
  };
  
  const handleUpdateStaffTimeLog = async (logId: string, updatedData: Partial<StaffTimeLog>) => {
      await updateStaffTimeLog(logId, updatedData, currentUser);
      addNotification("Registro de fichaje actualizado.");
  };

  const handleExport = (dataType: string) => {
    let dataToExport: any[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const isStudentActiveThisMonth = (student: Student): boolean => {
        if (!student.startMonth) return false;
        const startDate = new Date(student.startMonth);
        const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;
        return startDate <= lastDayThisMonth && (!endDate || endDate >= firstDayThisMonth);
    }
    switch (dataType) {
        case 'alumnos':
            dataToExport = [...students].sort((a: Student, b: Student) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)).map(c => ({ Estado: isStudentActiveThisMonth(c) ? 'Activo' : 'Inactivo', Nombre: c.name, Apellidos: c.surname, Fecha_Nacimiento: c.birthDate, Mes_Inicio: c.startMonth, Mes_Baja_Previsto: c.plannedEndMonth, Direccion: c.address, Padre: c.fatherName, Telefono_1: c.phone1, Madre: c.motherName, Telefono_2: c.phone2, Email: c.parentEmail, Horario: schedules.find(s => s.id === c.schedule)?.name || c.schedule, Alergias: c.allergies, Personas_Autorizadas: c.authorizedPickup, Matricula_Pagada: c.enrollmentPaid ? 'Sí' : 'No', Metodo_Pago: c.paymentMethod, Titular_Cuenta: c.accountHolderName, NIF_Titular: c.nif }));
            break;
        case 'asistencia':
            dataToExport = [...attendance].sort((a: Attendance, b: Attendance) => b.date.localeCompare(a.date)).map(a => ({ Alumno: a.childName, Fecha: a.date, Hora_Entrada: a.entryTime, Dejado_Por: a.droppedOffBy, Hora_Salida: a.exitTime, Recogido_Por: a.pickedUpBy }));
            break;
        case 'facturacion':
            const activeStudentIds = new Set(students.filter(isStudentActiveThisMonth).map(c => c.numericId));
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            dataToExport = invoices.filter(inv => { const invDate = new Date(inv.date); return activeStudentIds.has(inv.childId) && invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear; }).sort((a: Invoice, b: Invoice) => a.childName.localeCompare(b.childName)).map(i => ({ Factura_ID: i.numericId, Alumno: i.childName, Base: i.base, Penalizaciones: i.penalties, Importe_Total: i.amount, Estado: i.status }));
            break;
        case 'penalizaciones':
            dataToExport = [...penalties].sort((a: Penalty, b: Penalty) => b.date.localeCompare(a.date)).map(p => ({ Alumno: p.childName, Fecha: p.date, Importe: p.amount, Motivo: p.reason }));
            break;
        case 'fichajes':
            dataToExport = [...staffTimeLogs].sort((a: StaffTimeLog, b: StaffTimeLog) => { const dateCompare = b.date.localeCompare(a.date); if (dateCompare !== 0) return dateCompare; return (b.checkIn || '').localeCompare(a.checkIn || ''); }).map(log => ({ Usuario: log.userName, Fecha: log.date, Entrada: log.checkIn, Salida: log.checkOut }));
            break;
        case 'historial':
            const parseTimestamp = (timestamp: string): number => {
                if (!timestamp) return 0;
                if (timestamp.includes('T') && timestamp.includes('Z')) return new Date(timestamp).getTime();
                if (timestamp.includes('/') && timestamp.includes(',')) {
                    try {
                        const [datePart, timePart] = timestamp.split(', ');
                        const [day, month, year] = datePart.split('/').map(Number);
                        const [hour, minute, second] = timePart.split(':').map(Number);
                        return new Date(year, month - 1, day, hour, minute, second).getTime();
                    } catch (e) { return 0; }
                }
                const date = new Date(timestamp);
                return isNaN(date.getTime()) ? 0 : date.getTime();
            };
            dataToExport = [...appHistory].sort((a: AppHistoryLog, b: AppHistoryLog) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp)).map(h => ({ Fecha: h.timestamp ? new Date(parseTimestamp(h.timestamp)).toLocaleString('es-ES') : 'N/A', Usuario: h.user, Accion: h.action, Detalles: h.details }));
            break;
        default: addNotification("Tipo de dato para exportar no reconocido."); return;
    }
    if (dataToExport.length === 0) { addNotification("No hay datos para exportar."); return; }
    try {
        const csv = convertToCSV(dataToExport);
        downloadCSV(csv, `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`);
        addNotification(`Exportando ${dataType} a CSV.`);
    } catch (error) {
        console.error("Error exporting to CSV:", error);
        addNotification("Ocurrió un error al exportar los datos.");
    }
  };

  const handleGeneratePDFInvoice = (student: Student) => {
        if (!student) { addNotification("Error: No se ha seleccionado un alumno."); return; }
        const today = new Date();
        const targetMonth = today.getMonth();
        const targetYear = today.getFullYear();
        
        const schedule = schedules.find(s => s.id === student.schedule);
        if (!schedule) { addNotification("Error: El alumno no tiene horario."); return; }
        
        let baseFee = schedule.price;
        const extendedScheduleFee = student.extendedSchedule ? 30 : 0;
        
        const penaltiesThisMonth = penalties.filter(p => p.childId === student.numericId && new Date(p.date).getMonth() === targetMonth && new Date(p.date).getFullYear() === targetYear);
        const totalPenalties = penaltiesThisMonth.reduce((sum, p) => sum + p.amount, 0);

        const startDate = new Date(student.startMonth || today);
        const isFirstMonth = startDate.getMonth() === targetMonth && startDate.getFullYear() === targetYear;
        const enrollmentFee = !student.enrollmentPaid || isFirstMonth ? 100 : 0;

        const totalAmount = baseFee + extendedScheduleFee + totalPenalties + enrollmentFee;
        
        const docPDF = new jsPDF();
        docPDF.setFont('Helvetica', 'bold'); docPDF.setFontSize(32); docPDF.setTextColor('#c55a33');
        docPDF.text("mi pequeño recreo", 105, 22, { align: 'center' });
        docPDF.setFont('Helvetica', 'normal'); docPDF.setFontSize(10); docPDF.setTextColor(40, 40, 40);
        docPDF.text("Vision Paideia SLU", 20, 40); docPDF.text("CIF: B21898341", 20, 45); docPDF.text("C/Alonso Cano 24, 28003, Madrid", 20, 50);
        docPDF.text(`Factura Nº: ${targetYear}-${String(Date.now()).slice(-4)}`, 190, 40, { align: 'right' });
        docPDF.text(`Fecha: ${today.toLocaleDateString('es-ES')}`, 190, 45, { align: 'right' });
        docPDF.setDrawColor(220, 220, 220); docPDF.rect(15, 60, 180, 25);
        docPDF.setFont('Helvetica', 'bold'); docPDF.text("Cliente:", 20, 66); docPDF.setFont('Helvetica', 'normal');
        const clientName = student.accountHolderName || `${student.fatherName || ''} ${student.motherName || ''}`.trim();
        docPDF.text(`Nombre y apellidos: ${clientName}`, 20, 72); docPDF.text(`NIF: ${student.nif || 'No especificado'}`, 20, 78); docPDF.text(`Dirección: ${student.address || 'No especificada'}`, 100, 78);
        const tableColumn = ["Concepto", "Cantidad", "Precio unitario", "Importe"];
        const tableRows = [];
        if (enrollmentFee > 0) tableRows.push(["Matrícula", "1", `100.00 ${config.currency}`, `100.00 ${config.currency}`]);
        tableRows.push([`Jardín de infancia (${today.toLocaleString('es-ES', { month: 'long' })})`, "1", `${baseFee.toFixed(2)} ${config.currency}`, `${baseFee.toFixed(2)} ${config.currency}`]);
        if (extendedScheduleFee > 0) tableRows.push([`Suplemento Horario Ampliado`, "1", `${extendedScheduleFee.toFixed(2)} ${config.currency}`, `${extendedScheduleFee.toFixed(2)} ${config.currency}`]);
        if(totalPenalties > 0) tableRows.push([`Penalizaciones por retraso`, "", "", `${totalPenalties.toFixed(2)} ${config.currency}`]);
        tableRows.push(["", "", { content: "Total", styles: { fontStyle: 'bold' } } as any, { content: `${totalAmount.toFixed(2)} ${config.currency}`, styles: { fontStyle: 'bold' } } as any]);
        autoTable(docPDF, {
            startY: 90, head: [tableColumn], body: tableRows, theme: 'grid', headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            didDrawPage: (data: any) => {
                docPDF.setFontSize(10);
                docPDF.text(`Forma de pago: ${student.paymentMethod}`, data.settings.margin.left, (docPDF.internal.pageSize || {getHeight: () => 0}).getHeight() - 25);
                docPDF.setFont('Helvetica', 'bold'); docPDF.setFontSize(18); docPDF.setTextColor('#c55a33');
                docPDF.text("mi pequeño recreo", 105, (docPDF.internal.pageSize || {getHeight: () => 0}).getHeight() - 10, { align: 'center' });
            },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } }
        });
        docPDF.save(`factura_${student.name}_${student.surname}_${today.toISOString().split('T')[0]}.pdf`);
        addNotification(`Generando factura PDF para ${student.name}.`);
  };

  const handleGenerateNextMonthPDFInvoice = (student: Student) => {
        if (!student) { addNotification("Error: No se ha seleccionado un alumno."); return; }
        const today = new Date();
        const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const schedule = schedules.find(s => s.id === (student.nextMonthSchedule || student.schedule));
        if (!schedule) { addNotification("Error: El alumno no tiene horario válido."); return; }
        const baseFee = schedule.price;
        const extendedScheduleFee = student.extendedSchedule ? 30 : 0;
        const startDate = new Date(student.startMonth || today);
        const isFirstMonth = startDate.getMonth() === nextMonthDate.getMonth() && startDate.getFullYear() === nextMonthDate.getFullYear();
        const enrollmentFee = !student.enrollmentPaid || isFirstMonth ? 100 : 0;
        const totalAmount = baseFee + extendedScheduleFee + enrollmentFee;
        
        const docPDF = new jsPDF();
        docPDF.setFont('Helvetica', 'bold'); docPDF.setFontSize(32); docPDF.setTextColor('#c55a33');
        docPDF.text("mi pequeño recreo", 105, 22, { align: 'center' });
        docPDF.setFont('Helvetica', 'normal'); docPDF.setFontSize(10); docPDF.setTextColor(40, 40, 40);
        docPDF.text("Vision Paideia SLU", 20, 40); docPDF.text("CIF: B21898341", 20, 45); docPDF.text("C/Alonso Cano 24, 28003, Madrid", 20, 50);
        docPDF.text(`Factura Nº: ${nextMonthDate.getFullYear()}-${String(Date.now()).slice(-4)}`, 190, 40, { align: 'right' });
        docPDF.text(`Fecha: ${today.toLocaleDateString('es-ES')}`, 190, 45, { align: 'right' });
        docPDF.setDrawColor(220, 220, 220); docPDF.rect(15, 60, 180, 25);
        docPDF.setFont('Helvetica', 'bold'); docPDF.text("Cliente:", 20, 66); docPDF.setFont('Helvetica', 'normal');
        const clientName = student.accountHolderName || `${student.fatherName || ''} ${student.motherName || ''}`.trim();
        docPDF.text(`Nombre y apellidos: ${clientName}`, 20, 72); docPDF.text(`NIF: ${student.nif || 'No especificado'}`, 20, 78); docPDF.text(`Dirección: ${student.address || 'No especificada'}`, 100, 78);
        const tableColumn = ["Concepto", "Cantidad", "Precio unitario", "Importe"];
        const tableRows = [];
        if (enrollmentFee > 0) tableRows.push(["Matrícula", "1", `100.00 ${config.currency}`, `100.00 ${config.currency}`]);
        tableRows.push([`Jardín de infancia (${nextMonthDate.toLocaleString('es-ES', { month: 'long' })})`, "1", `${baseFee.toFixed(2)} ${config.currency}`, `${baseFee.toFixed(2)} ${config.currency}`]);
        if (extendedScheduleFee > 0) tableRows.push([`Suplemento Horario Ampliado`, "1", `${extendedScheduleFee.toFixed(2)} ${config.currency}`, `${extendedScheduleFee.toFixed(2)} ${config.currency}`]);
        tableRows.push(["", "", { content: "Total", styles: { fontStyle: 'bold' } } as any, { content: `${totalAmount.toFixed(2)} ${config.currency}`, styles: { fontStyle: 'bold' } } as any]);
        autoTable(docPDF, {
            startY: 90, head: [tableColumn], body: tableRows, theme: 'grid', headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            didDrawPage: (data: any) => {
                docPDF.setFontSize(10);
                docPDF.text(`Forma de pago: ${student.paymentMethod}`, data.settings.margin.left, (docPDF.internal.pageSize || {getHeight: () => 0}).getHeight() - 25);
                docPDF.setFont('Helvetica', 'bold'); docPDF.setFontSize(18); docPDF.setTextColor('#c55a33');
                docPDF.text("mi pequeño recreo", 105, (docPDF.internal.pageSize || {getHeight: () => 0}).getHeight() - 10, { align: 'center' });
            },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } }
        });
        docPDF.save(`factura_adelantada_${student.name}_${student.surname}_${nextMonthDate.toISOString().split('T')[0]}.pdf`);
        addNotification(`Generando factura del próximo mes para ${student.name}.`);
  };

  const handleGeneratePastMonthsInvoice = (student: Student) => {
        if (!student.startMonth) { addNotification(`No se puede generar factura de meses pasados sin fecha de alta.`); return; }
        const today = new Date();
        const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = new Date(student.startMonth);
        const monthsToInvoice = [];
        let cursorDate = new Date(startDate);
        while (cursorDate < firstDayCurrentMonth) {
            monthsToInvoice.push(new Date(cursorDate));
            cursorDate.setMonth(cursorDate.getMonth() + 1);
        }
        if (monthsToInvoice.length === 0) { addNotification(`No hay meses anteriores para facturar para ${student.name}.`); return; }
        const schedule = schedules.find(s => s.id === student.schedule);
        if(!schedule) { addNotification("El alumno no tiene un horario válido."); return; }
        
        const tableRows: (string | { content: string, styles: any })[][] = [];
        
        monthsToInvoice.forEach((d, index) => {
            const isFirstMonth = index === 0;
            const enrollmentFee = (!student.enrollmentPaid || isFirstMonth) ? 100 : 0;
            const baseFee = schedule.price;
            const extendedScheduleFee = student.extendedSchedule ? 30 : 0;
            
            if (enrollmentFee > 0) {
                tableRows.push([`Matrícula (${d.toLocaleString('es-ES', { month: 'long', year: 'numeric' })})`, "1", `100.00 ${config.currency}`, `100.00 ${config.currency}`]);
            }
            tableRows.push([`Jardín de infancia (${d.toLocaleString('es-ES', { month: 'long', year: 'numeric' })})`, "1", `${baseFee.toFixed(2)} ${config.currency}`, `${baseFee.toFixed(2)} ${config.currency}`]);
            if (extendedScheduleFee > 0) {
                tableRows.push([`Suplemento Horario Ampliado (${d.toLocaleString('es-ES', { month: 'long', year: 'numeric' })})`, "1", `${extendedScheduleFee.toFixed(2)} ${config.currency}`, `${extendedScheduleFee.toFixed(2)} ${config.currency}`]);
            }
        });

        const totalAmount = tableRows.reduce((sum, row) => sum + parseFloat(row[3] as string), 0);
        
        const docPDF = new jsPDF();
        docPDF.setFont('Helvetica', 'bold'); docPDF.setFontSize(32); docPDF.setTextColor('#c55a33');
        docPDF.text("mi pequeño recreo", 105, 22, { align: 'center' });
        docPDF.setFont('Helvetica', 'normal'); docPDF.setFontSize(10); docPDF.setTextColor(40, 40, 40);
        docPDF.text("Vision Paideia SLU", 20, 40); docPDF.text("CIF: B21898341", 20, 45); docPDF.text("C/Alonso Cano 24, 28003, Madrid", 20, 50);
        docPDF.text(`Factura Nº: ${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, 190, 40, { align: 'right' });
        docPDF.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 190, 45, { align: 'right' });
        docPDF.setDrawColor(220, 220, 220); docPDF.rect(15, 60, 180, 25);
        docPDF.setFont('Helvetica', 'bold'); docPDF.text("Cliente:", 20, 66); docPDF.setFont('Helvetica', 'normal');
        const clientName = student.accountHolderName || `${student.fatherName || ''} ${student.motherName || ''}`.trim();
        docPDF.text(`Nombre y apellidos: ${clientName}`, 20, 72); docPDF.text(`NIF: ${student.nif || 'No especificado'}`, 20, 78); docPDF.text(`Dirección: ${student.address || 'No especificada'}`, 100, 78);
        const tableColumn = ["Concepto", "Cantidad", "Precio unitario", "Importe"];
        tableRows.push(["", "", { content: "Total", styles: { fontStyle: 'bold' } } as any, { content: `${totalAmount.toFixed(2)} ${config.currency}`, styles: { fontStyle: 'bold' } } as any]);
        autoTable(docPDF, {
            startY: 90, head: [tableColumn], body: tableRows, theme: 'grid', headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            didDrawPage: (data: any) => {
                docPDF.setFontSize(10);
                docPDF.text(`Forma de pago: ${student.paymentMethod}`, data.settings.margin.left, (docPDF.internal.pageSize || {getHeight: () => 0}).getHeight() - 25);
                docPDF.setFont('Helvetica', 'bold'); docPDF.setFontSize(18); docPDF.setTextColor('#c55a33');
                docPDF.text("mi pequeño recreo", 105, (docPDF.internal.pageSize || {getHeight: () => 0}).getHeight() - 10, { align: 'center' });
            },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } }
        });
        docPDF.save(`factura_total_anterior_${student.name}_${student.surname}.pdf`);
        addNotification(`Generando factura total anterior para ${student.name}.`);
  };

  if (isLoading) return <LoadingSpinner />;
  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  const todayForLog = new Date().toISOString().split('T')[0];
  const todayLog = staffTimeLogs.find(log => log.userName === currentUser && log.date === todayForLog && log.checkIn && !log.checkOut);
  const staffUsersList = [...new Set(staffTimeLogs.map(log => log.userName))];

  return (
    <>
      <div style={styles.notificationContainer}>{notifications.map(n => <Notification key={n.id} message={n.message} onClose={() => setNotifications(p => p.filter(item => item.id !== n.id))} />)}</div>
      {confirmModal.isOpen && <ConfirmModal message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })} />}
      
      {selectedChild && <StudentDetailModal 
          student={selectedChild} 
          onClose={() => setSelectedChild(null)} 
          onViewPersonalCalendar={(student) => { setSelectedChild(null); setViewingCalendarForStudent(student); }} 
          onUpdate={handleUpdateStudent} 
          onAddDocument={handleAddDocument} 
          onGenerateCurrentInvoice={handleGeneratePDFInvoice} 
          onGenerateNextMonthInvoice={handleGenerateNextMonthPDFInvoice} 
          onGeneratePastMonthsInvoice={handleGeneratePastMonthsInvoice} 
          currentUser={currentUser} 
      />}
      
      {viewingCalendarForStudent && <StudentPersonalCalendar student={viewingCalendarForStudent} onClose={() => setViewingCalendarForStudent(null)} />}
      
      <div style={styles.appContainer}>
        <aside style={styles.sidebar}>
          <div>
            <div style={{ padding: '20px 15px', display: 'flex', justifyContent: 'center' }}><MiPequenoRecreoLogo width={180}/></div>
            <h2 style={styles.sidebarTitle}>General</h2>
            {[ { id: 'dashboard', name: 'Panel de Control', icon: BarChart2 }, { id: 'inscripciones', name: 'Nueva Inscripción', icon: UserPlus }, { id: 'alumnos', name: 'Alumnos', icon: Users }, { id: 'asistencia', name: 'Asistencia', icon: Clock }, { id: 'calendario', name: 'Calendario', icon: CalendarIcon } ].map(tab => { const Icon = tab.icon; const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...styles.sidebarButton, ...(isActive ? styles.sidebarButtonActive : {})}}><Icon size={20} style={{ marginRight: '12px' }} /><span>{tab.name}</span></button>); })}
            <h2 style={{...styles.sidebarTitle, marginTop: '20px'}}>Administración</h2>
            {[ { id: 'facturacion', name: 'Facturación', icon: FileText }, { id: 'penalizaciones', name: 'Penalizaciones', icon: DollarSign } ].map(tab => { const Icon = tab.icon; const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...styles.sidebarButton, ...(isActive ? styles.sidebarButtonActive : {})}}><Icon size={20} style={{ marginRight: '12px' }} /><span>{tab.name}</span></button>); })}
            {currentUser !== 'Gonzalo Navarro' && ( <> <button key='control' onClick={() => setActiveTab('control')} style={{...styles.sidebarButton, ...(activeTab === 'control' ? styles.sidebarButtonActive : {})}}> <UserCheck size={20} style={{ marginRight: '12px' }} /><span>Control Horario</span> </button> <button key='ayuda' onClick={() => setActiveTab('ayuda')} style={{...styles.sidebarButton, ...(activeTab === 'ayuda' ? styles.sidebarButtonActive : {})}}> <HelpCircle size={20} style={{ marginRight: '12px' }} /><span>Ayuda</span> </button> </> )}
            {currentUser === 'Gonzalo Navarro' && ( <> {[ { id: 'personal', name: 'Personal', icon: Briefcase }, { id: 'historial', name: 'Historial Web', icon: History }, { id: 'configuracion', name: 'Configuración', icon: SettingsIcon }, ].map(tab => { const Icon = tab.icon; const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...styles.sidebarButton, ...(isActive ? styles.sidebarButtonActive : {})}}><Icon size={20} style={{ marginRight: '12px' }} /><span>{tab.name}</span></button>); })} </> )}
          </div>
          <div>
            <div style={styles.currentUserInfo}><p style={{margin: 0}}>Usuario: <strong>{currentUser}</strong></p></div>
            <footer style={styles.sidebarFooter}>
                <p style={{margin: '2px 0', fontWeight: 'bold'}}>Vision Paideia SLU</p>
                <p style={{margin: '2px 0'}}>B21898341</p>
                <p style={{margin: '2px 0'}}>C/ Alonso Cano 24, 28003, Madrid</p>
            </footer>
          </div>
        </aside>
        <main style={styles.mainContent}>
          <header style={styles.header}>
            <h1 style={styles.headerTitle}>{activeTab === 'inscripciones' ? 'Nueva Inscripción' : activeTab === 'control' ? 'Control Horario' : activeTab === 'ayuda' ? 'Ayuda' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
             <button onClick={handleLogout} style={styles.logoutButton}> <LogOut size={16} style={{ marginRight: '8px' }} />Cerrar Sesión </button>
          </header>
          <div style={styles.contentArea}>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'inscripciones' && <NewStudentForm onAddChild={handleAddChild} childForm={childForm} onFormChange={setChildForm} schedules={schedules} />}
            {activeTab === 'alumnos' && <StudentList onSelectChild={setSelectedChild} onDeleteChild={handleDeleteChild} onExport={() => handleExport('alumnos')} />}
            {activeTab === 'asistencia' && <AttendanceManager onSave={handleSaveAttendance} onExport={() => handleExport('asistencia')} />}
            {activeTab === 'calendario' && <CalendarView />}
            {activeTab === 'facturacion' && <Invoicing onUpdateStatus={updateInvoiceStatus} onExport={() => handleExport('facturacion')} onGenerateCurrentInvoice={handleGeneratePDFInvoice} onGenerateNextMonthInvoice={handleGenerateNextMonthPDFInvoice} onGeneratePastMonthsInvoice={handleGeneratePastMonthsInvoice} onDeleteInvoice={handleDeleteInvoice} addNotification={addNotification} />}
            {activeTab === 'penalizaciones' && <PenaltiesViewer onExport={() => handleExport('penalizaciones')} onUpdatePenalty={handleUpdatePenalty} onDeletePenalty={handleDeletePenalty} />}
            {activeTab === 'control' && <StaffControlPanel currentUser={currentUser} todayLog={todayLog} onCheckIn={handleStaffCheckIn} onCheckOut={handleStaffCheckOut} />}
            {activeTab === 'personal' && <StaffLogViewer onExport={() => handleExport('fichajes')} staffUsers={staffUsersList} onUpdateStaffTimeLog={handleUpdateStaffTimeLog} />}
            {activeTab === 'historial' && <AppHistoryViewer onExport={() => handleExport('historial')} />}
            {activeTab === 'configuracion' && <Settings onSave={handleSaveConfig} addNotification={addNotification} />}
            {activeTab === 'ayuda' && <Help />}
          </div>
        </main>
      </div>
    </>
  );
};

export default App;