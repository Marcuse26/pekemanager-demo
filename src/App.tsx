// Contenido para: src/App.tsx
import { useState, useCallback, useEffect } from 'react';
import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import {
    Users, Clock, FileText, DollarSign, UserPlus, LogOut,
    Calendar as CalendarIcon, Briefcase, BarChart2, UserCheck,
    Settings as SettingsIcon, History, HelpCircle
} from 'lucide-react';

// --- Importaciones de nuestro código ---
import { db } from './firebase/config';
import { styles } from './styles';
import { convertToCSV, downloadCSV } from './utils/csvHelper';
import { useAppContext } from './context/AppContext';
import type { Student, Invoice, StaffTimeLog, Config, Attendance, AppHistoryLog, NotificationMessage, StudentFormData, HistoryLog, Document, Penalty } from './types';

// --- Importaciones de Componentes ---
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
  const { students, attendance, invoices, penalties, config, schedules, staffTimeLogs, appHistory, isLoading, userId, addAppHistoryLog } = useAppContext();
  
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('isLoggedIn') === 'true');
  const [currentUser, setCurrentUser] = useState<string>(() => sessionStorage.getItem('currentUser') || 'invitado');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [viewingCalendarForStudent, setViewingCalendarForStudent] = useState<Student | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  const [childForm, setChildForm] = useState<StudentFormData>({ name: '', surname: '', birthDate: '', address: '', fatherName: '', motherName: '', phone1: '', phone2: '', parentEmail: '', schedule: '', allergies: '', authorizedPickup: '', enrollmentPaid: false, monthlyPayment: true, paymentMethod: '', accountHolderName: '', nif: '', startMonth: '', plannedEndMonth: '', extendedSchedule: false });
  
  const appId = 'pekemanager-app';

  useEffect(() => {
      if(selectedChild) {
          const freshStudentData = students.find(c => c.id === selectedChild.id);
          setSelectedChild(freshStudentData || null);
      }
  }, [students, selectedChild]);

  const addNotification = (message: string) => { setNotifications(prev => [...prev, { id: Date.now(), message }]); };

  // ... (El resto de funciones hasta la generación de facturas se mantiene igual) ...

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
        let totalAmount = 0;

        monthsToInvoice.forEach((d, index) => {
            const isFirstMonth = index === 0;
            const enrollmentFee = (!student.enrollmentPaid || isFirstMonth) ? 100 : 0;
            const baseFee = schedule.price;
            const extendedScheduleFee = student.extendedSchedule ? 30 : 0;
            const monthTotal = baseFee + extendedScheduleFee + enrollmentFee;
            totalAmount += monthTotal;

            if (enrollmentFee > 0) {
                tableRows.push([`Matrícula (${d.toLocaleString('es-ES', { month: 'long', year: 'numeric' })})`, "1", `100.00 ${config.currency}`, `100.00 ${config.currency}`]);
            }
            tableRows.push([`Jardín de infancia (${d.toLocaleString('es-ES', { month: 'long', year: 'numeric' })})`, "1", `${baseFee.toFixed(2)} ${config.currency}`, `${baseFee.toFixed(2)} ${config.currency}`]);
            if (extendedScheduleFee > 0) {
                tableRows.push([`Suplemento Horario Ampliado (${d.toLocaleString('es-ES', { month: 'long', year: 'numeric' })})`, "1", `${extendedScheduleFee.toFixed(2)} ${config.currency}`, `${extendedScheduleFee.toFixed(2)} ${config.currency}`]);
            }
        });
        
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

  const todayForLog = new Date().toISOString().split('T')[0];
  const todayLog = staffTimeLogs.find(log => log.userName === currentUser && log.date === todayForLog && log.checkIn && !log.checkOut);
  const staffUsersList = [...new Set(staffTimeLogs.map(log => log.userName))];

  const renderTabContent = () => {
      switch(activeTab) {
          case 'dashboard': return <Dashboard />;
          case 'inscripciones': return <NewStudentForm onAddChild={handleAddChild} childForm={childForm} onFormChange={setChildForm} schedules={schedules} />;
          case 'alumnos': return <StudentList onSelectChild={setSelectedChild} onDeleteChild={handleDeleteChild} onExport={() => handleExport('alumnos')} />;
          case 'asistencia': return <AttendanceManager onSave={handleSaveAttendance} onExport={() => handleExport('asistencia')} />;
          case 'calendario': return <CalendarView />;
          case 'facturacion': return <Invoicing onUpdateStatus={handleUpdateInvoiceStatus} onExport={() => handleExport('facturacion')} onGenerateCurrentInvoice={handleGeneratePDFInvoice} onGenerateNextMonthInvoice={handleGenerateNextMonthPDFInvoice} onGeneratePastMonthsInvoice={handleGeneratePastMonthsInvoice} onDeleteInvoice={handleDeleteInvoice} addNotification={addNotification} />;
          case 'penalizaciones': return <PenaltiesViewer onExport={() => handleExport('penalizaciones')} onUpdatePenalty={handleUpdatePenalty} onDeletePenalty={handleDeletePenalty} />;
          case 'control': return <StaffControlPanel currentUser={currentUser} todayLog={todayLog} onCheckIn={handleStaffCheckIn} onCheckOut={handleStaffCheckOut} />;
          case 'personal': return <StaffLogViewer logs={staffTimeLogs} onExport={() => handleExport('fichajes')} staffUsers={staffUsersList} onUpdateStaffTimeLog={handleUpdateStaffTimeLog} />;
          case 'historial': return <AppHistoryViewer onExport={() => handleExport('historial')} />;
          case 'configuracion': return <Settings config={config} onSave={handleSaveConfig} addNotification={addNotification} />;
          case 'ayuda': return <Help />;
          default: return <Dashboard />;
      }
  }

  if (isLoading) return <LoadingSpinner />;
  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <>
      <div style={styles.notificationContainer}>{notifications.map(n => <Notification key={n.id} message={n.message} onClose={() => setNotifications(p => p.filter(item => item.id !== n.id))} />)}</div>
      {confirmModal.isOpen && <ConfirmModal message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })} />}
      {selectedChild && <StudentDetailModal student={selectedChild} onClose={() => setSelectedChild(null)} onViewPersonalCalendar={(student) => { setSelectedChild(null); setViewingCalendarForStudent(student); }} onUpdate={handleUpdateStudent} onAddDocument={handleAddDocument} onGenerateCurrentInvoice={handleGeneratePDFInvoice} onGenerateNextMonthInvoice={handleGenerateNextMonthPDFInvoice} onGeneratePastMonthsInvoice={handleGeneratePastMonthsInvoice} currentUser={currentUser} />}
      {viewingCalendarForStudent && <StudentPersonalCalendar student={viewingCalendarForStudent} onClose={() => setViewingCalendarForStudent(null)} attendance={attendance} penalties={penalties} />}
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
          <div style={styles.contentArea}> {renderTabContent()} </div>
        </main>
      </div>
    </>
  );
};

export default App;