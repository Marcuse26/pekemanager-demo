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
import type { Student, Invoice, StaffTimeLog, NotificationMessage, StudentFormData, Document, Penalty, Attendance, Config } from './types';

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
    students, config, schedules, staffTimeLogs, isLoading, attendance, invoices, penalties, appHistory,
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
    let fileName = `${dataType}_${new Date().toISOString().split('T')[0]}.csv`;

    switch (dataType) {
        case 'alumnos': {
            const today = new Date();
            const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            dataToExport = students.map(student => {
                const startDate = student.startMonth ? new Date(student.startMonth) : null;
                const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;
                const isActive = startDate && startDate < firstDayNextMonth && (!endDate || endDate >= firstDayThisMonth);
                const { documents, modificationHistory, ...rest } = student;
                return { ...rest, Estado: isActive ? 'Activo' : 'Inactivo' };
            }).sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
            break;
        }
        case 'asistencia':
            dataToExport = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
            break;
        case 'facturacion': {
            const currentMonth = new Date().getMonth();
            dataToExport = invoices.filter(i => new Date(i.date).getMonth() === currentMonth).map(({ date, ...rest }) => rest).sort((a, b) => a.childName.localeCompare(b.childName));
            break;
        }
        case 'penalizaciones':
            dataToExport = [...penalties].sort((a, b) => b.date.localeCompare(a.date));
            break;
        case 'fichajes':
            dataToExport = [...staffTimeLogs].sort((a, b) => b.date.localeCompare(a.date));
            break;
        case 'historial':
            dataToExport = [...appHistory].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
            break;
    }
    
    if (dataToExport.length > 0) {
        const csv = convertToCSV(dataToExport);
        downloadCSV(csv, fileName);
        addNotification(`Exportando ${dataType}.`);
    } else {
        addNotification(`No hay datos para exportar en ${dataType}.`);
    }
  };
  
  const calculateAttendanceBasedFee = (student: Student, targetMonth: number, targetYear: number) => {
    const schedule = schedules.find(s => s.id === student.schedule);
    if (!schedule) return { base: 0, description: "Sin horario asignado" };

    const firstDayOfMonth = new Date(targetYear, targetMonth, 1);
    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0);
    const studentStartDate = student.startMonth ? new Date(student.startMonth) : null;
    const studentEndDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

    if (studentStartDate && studentStartDate <= firstDayOfMonth && (!studentEndDate || studentEndDate >= lastDayOfMonth)) {
        return { base: schedule.price, description: `Cuota mensual (${schedule.name})` };
    }

    if (studentStartDate) {
        const startOfPeriod = studentStartDate > firstDayOfMonth ? studentStartDate : firstDayOfMonth;
        const endOfPeriod = (!studentEndDate || studentEndDate > lastDayOfMonth) ? lastDayOfMonth : studentEndDate;
        
        let businessDays = 0;
        if (endOfPeriod >= startOfPeriod) {
            let currentDate = new Date(startOfPeriod);
            endOfPeriod.setHours(23, 59, 59, 999);
            while (currentDate <= endOfPeriod) {
                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    businessDays++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        if (businessDays > 0) {
            let base = 0;
            let description = `${businessDays} día(s) laborable(s)`;

            if (businessDays === 1) {
                base = 40;
                description = `1 día suelto`;
            } else if (businessDays >= 2 && businessDays <= 5) {
                base = schedule.price / 4;
                description = `Cuota de 1 semana (${businessDays} días)`;
            } else if (businessDays >= 6 && businessDays <= 10) {
                base = schedule.price / 3;
                description = `Cuota de 2 semanas (${businessDays} días)`;
            } else if (businessDays >= 11 && businessDays <= 15) {
                base = schedule.price / 2;
                description = `Cuota de 3 semanas (${businessDays} días)`;
            } else {
                base = schedule.price;
                description = `Cuota mensual completa (${businessDays} días)`;
            }
            
            return { base, description };
        }
    }

    return { base: 0, description: "Sin días de inscripción válidos para este mes" };
  };

  const generateInvoicePDF = (student: Student, targetMonth: number, targetYear: number) => {
    const doc = new jsPDF();
    const calculation = calculateAttendanceBasedFee(student, targetMonth, targetYear);
    
    if (calculation.base === 0 && student.enrollmentPaid) {
        addNotification(`No hay conceptos que facturar para ${student.name} en este mes.`);
        return;
    }

    const invoiceDate = new Date(targetYear, targetMonth, 1);
    const monthName = invoiceDate.toLocaleString('es-ES', { month: 'long' });
    const monthYearStr = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${targetYear}`;

    const body = [];
    let total = 0;
    
    if (calculation.base > 0) {
        body.push(['Cuota Flexible', calculation.description, `${calculation.base.toFixed(2)} ${config.currency}`]);
        total += calculation.base;
    }

    if (student.extendedSchedule && calculation.base > 0) {
        body.push(['Extra', 'Horario Ampliado', `30.00 ${config.currency}`]);
        total += 30;
    }

    const studentPenalties = penalties.filter(p => p.childId === student.numericId && new Date(p.date).getMonth() === targetMonth && new Date(p.date).getFullYear() === targetYear);
    studentPenalties.forEach(p => {
        body.push(['Penalización', `${p.reason} (${p.date})`, `${p.amount.toFixed(2)} ${config.currency}`]);
        total += p.amount;
    });

    const startMonthDate = student.startMonth ? new Date(student.startMonth) : null;
    const isFirstMonth = startMonthDate && startMonthDate.getFullYear() === targetYear && startMonthDate.getMonth() === targetMonth;
    const isCurrentMonth = new Date().getFullYear() === targetYear && new Date().getMonth() === targetMonth;
    
    if (!student.enrollmentPaid && isCurrentMonth) {
        body.push(['Matrícula', 'Pago de Matrícula', `100.00 ${config.currency}`]);
        total += 100;
    } else if (student.enrollmentPaid && isFirstMonth) {
        body.push(['Matrícula', 'Matrícula (Ya Pagada)', `100.00 ${config.currency}`]);
    }

    doc.setFontSize(22);
    doc.text("mi pequeño recreo", 20, 20);
    doc.setFontSize(16);
    doc.text(`Factura: ${monthYearStr}`, 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 140, 20);
    doc.text(`Alumno: ${student.name} ${student.surname}`, 20, 45);
    doc.text(`Titular: ${student.accountHolderName}`, 20, 52);
    doc.text(`NIF/DNI: ${student.nif || 'No especificado'}`, 20, 59);

    autoTable(doc, {
        startY: 70,
        head: [['Concepto', 'Descripción', 'Importe']],
        body: body,
        foot: [['Total', '', `${total.toFixed(2)} ${config.currency}`]],
        theme: 'striped',
        headStyles: { fillColor: [33, 37, 41] },
        footStyles: { fillColor: [33, 37, 41], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    doc.save(`factura_${student.surname}_${targetYear}_${targetMonth + 1}.pdf`);
    addNotification(`Generando factura para ${student.name}.`);
  };

  const handleGeneratePDFInvoice = (student: Student) => {
    const today = new Date();
    generateInvoicePDF(student, today.getMonth(), today.getFullYear());
  };

  const handleGenerateNextMonthPDFInvoice = (student: Student) => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    generateInvoicePDF(student, nextMonth.getMonth(), nextMonth.getFullYear());
  };

  const handleGeneratePastMonthsInvoice = (student: Student) => {
    if (!student.startMonth) {
        addNotification("El alumno no tiene fecha de alta para generar facturas pasadas.");
        return;
    }

    const doc = new jsPDF();
    const body = [];
    let total = 0;
    
    const startDate = new Date(student.startMonth);
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let loopDate = new Date(startDate);
    while (loopDate < firstDayOfCurrentMonth) {
        const targetMonth = loopDate.getMonth();
        const targetYear = loopDate.getFullYear();
        const monthName = loopDate.toLocaleString('es-ES', { month: 'long' });
        const monthYearStr = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${targetYear}`;
        
        const calculation = calculateAttendanceBasedFee(student, targetMonth, targetYear);
        if (calculation.base > 0) {
          body.push(['Cuota Flexible', `${calculation.description} (${monthYearStr})`, `${calculation.base.toFixed(2)} ${config.currency}`]);
          total += calculation.base;
        }

        if (student.extendedSchedule && calculation.base > 0) {
            body.push(['Extra Horario Ampliado', monthYearStr, `30.00 ${config.currency}`]);
            total += 30;
        }
        
        const isFirstMonth = startDate.getFullYear() === targetYear && startDate.getMonth() === targetMonth;
        if (student.enrollmentPaid && isFirstMonth) {
            body.push(['Matrícula (Histórico)', `Pagada en ${monthYearStr}`, `100.00 ${config.currency}`]);
        }

        const studentPenalties = penalties.filter(p => p.childId === student.numericId && new Date(p.date).getMonth() === targetMonth && new Date(p.date).getFullYear() === targetYear);
        studentPenalties.forEach(p => {
            body.push(['Penalización', `${p.reason} (${p.date})`, `${p.amount.toFixed(2)} ${config.currency}`]);
            total += p.amount;
        });

        loopDate.setMonth(loopDate.getMonth() + 1);
    }
    
    if (body.length === 0) {
      addNotification("No hay conceptos que facturar de meses pasados.");
      return;
    }

    doc.setFontSize(22);
    doc.text("mi pequeño recreo", 20, 20);
    doc.setFontSize(16);
    doc.text(`Factura Consolidada de Meses Anteriores`, 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 140, 20);
    doc.text(`Alumno: ${student.name} ${student.surname}`, 20, 45);
    doc.text(`Titular: ${student.accountHolderName}`, 20, 52);
    doc.text(`NIF/DNI: ${student.nif || 'No especificado'}`, 20, 59);

    autoTable(doc, {
        startY: 70,
        head: [['Concepto', 'Descripción', 'Importe']],
        body: body,
        foot: [['Total a Regularizar', '', `${total.toFixed(2)} ${config.currency}`]],
        theme: 'striped',
        headStyles: { fillColor: [33, 37, 41] },
        footStyles: { fillColor: [33, 37, 41], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    doc.save(`factura_pasada_${student.surname}.pdf`);
    addNotification(`Generando factura consolidada para ${student.name}.`);
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
            {activeTab === 'facturacion' && <Invoicing addNotification={addNotification} onGenerateCurrentInvoice={handleGeneratePDFInvoice} onGenerateNextMonthInvoice={handleGenerateNextMonthPDFInvoice} onGeneratePastMonthsInvoice={handleGeneratePastMonthsInvoice} />}
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