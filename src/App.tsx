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
import type { Student, Invoice, StaffTimeLog, NotificationMessage, StudentFormData, Document, Penalty, Attendance, AppHistoryLog } from './types';

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
  const { students, attendance, invoices, penalties, config, schedules, staffTimeLogs, appHistory, isLoading, addAppHistoryLog, addChild, deleteChild, updateStudent, addDocument, saveAttendance, updateInvoiceStatus, deleteInvoice, updatePenalty, deletePenalty, saveConfig, staffCheckIn, staffCheckOut, updateStaffTimeLog } = useAppContext();
  
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

  const handleExport = (dataType: string) => { /* ... (La lógica de exportar se queda aquí porque no modifica el estado) ... */ };

  const handleGeneratePDFInvoice = (student: Student) => { /* ... (La lógica de PDF se queda aquí) ... */ };
  const handleGenerateNextMonthPDFInvoice = (student: Student) => { /* ... */ };
  const handleGeneratePastMonthsInvoice = (student: Student) => { /* ... */ };

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
            {/* ... Sidebar JSX (no changes) ... */}
        </aside>
        <main style={styles.mainContent}>
          <header style={styles.header}>
            <h1 style={styles.headerTitle}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
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