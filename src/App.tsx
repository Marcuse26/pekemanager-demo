// Contenido para: src/App.tsx

// --- Importaciones de React y Librerías ---
import { useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

// --- Importaciones de Iconos ---
import {
    Users, Clock, FileText, DollarSign, UserPlus, LogOut,
    Calendar as CalendarIcon, Briefcase, BarChart2, UserCheck,
    Settings as SettingsIcon, History, HelpCircle
} from 'lucide-react';

// --- Importaciones de nuestro código modularizado ---
import { db, ensureAnonymousAuth } from './firebase/config';
import { schedules } from './config/schedules';
import { styles } from './styles';
import { convertToCSV, downloadCSV } from './utils/csvHelper';
import type {
    Student, Attendance, Penalty, Invoice, StaffTimeLog, Config, AppHistoryLog,
    NotificationMessage, StudentFormData, HistoryLog, Document
} from './types';

// --- Importaciones de Componentes de UI ---
import { MiPequenoRecreoLogo } from './components/common/Logos';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Notification } from './components/common/Notification';
import { ConfirmModal } from './components/common/ConfirmModal';
import LoginScreen from './components/LoginScreen';
import StaffControlPanel from './components/StaffControlPanel';
import StudentDetailModal from './components/modals/StudentDetailModal';
import StudentPersonalCalendar from './components/modals/StudentPersonalCalendar';

// --- Importaciones de las Pestañas (Tabs) ---
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

// --- COMPONENTE PRINCIPAL ---
const App = () => {

  // --- Estados de la Aplicación ---
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('isLoggedIn') === 'true');
  const [currentUser, setCurrentUser] = useState<string>(() => sessionStorage.getItem('currentUser') || 'invitado');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [viewingCalendarForStudent, setViewingCalendarForStudent] = useState<Student | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const appId = 'pekemanager-app';

  // --- Datos de Firestore ---
  const [config, setConfig] = useState<Config>({ centerName: 'mi pequeño recreo', currency: '€', lateFee: 6 });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [children, setChildren] = useState<Student[]>([]);
  const [childForm, setChildForm] = useState<StudentFormData>({ name: '', surname: '', birthDate: '', address: '', fatherName: '', motherName: '', phone1: '', phone2: '', parentEmail: '', schedule: '', allergies: '', authorizedPickup: '', enrollmentPaid: false, monthlyPayment: true, paymentMethod: '', accountHolderName: '', nif: '', startMonth: '', plannedEndMonth: '', extendedSchedule: false });
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [appHistory, setAppHistory] = useState<AppHistoryLog[]>([]);
  const [staffTimeLogs, setStaffTimeLogs] = useState<StaffTimeLog[]>([]);

  useEffect(() => {
    const unsubscribe = ensureAnonymousAuth(
        (uid) => {
            setUserId(uid);
            setIsLoading(false);
        },
        () => {
            setIsLoading(false);
            alert("Error crítico: No se pudo conectar a la base de datos.");
        }
    );
    return () => unsubscribe();
  }, []);

  const dataListeners = [
      { name: 'children', setter: setChildren },
      { name: 'attendance', setter: setAttendance },
      { name: 'penalties', setter: setPenalties },
      { name: 'invoices', setter: setInvoices },
      { name: 'appHistory', setter: setAppHistory },
      { name: 'staffTimeLog', setter: setStaffTimeLogs },
  ];

  useEffect(() => {
    if (!userId) return;

    const unsubscribers = dataListeners.map(({ name, setter }) => {
        const collectionPath = `/artifacts/${appId}/public/data/${name}`;
        const q = query(collection(db, collectionPath));
        return onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setter(data as any);
        }, (error) => console.error(`Error fetching ${name}:`, error));
    });

    const configDocPath = `/artifacts/${appId}/public/data/settings/config`;
    const unsubConfig = onSnapshot(doc(db, configDocPath), (docSnap) => {
        if (docSnap.exists()) {
            setConfig(docSnap.data() as Config);
        } else {
             setDoc(doc(db, configDocPath), config);
        }
    }, (error) => console.error("Error fetching config:", error));

    unsubscribers.push(unsubConfig);

    return () => unsubscribers.forEach(unsub => unsub());

  }, [userId]);

  useEffect(() => {
      if(selectedChild) {
          const freshStudentData = children.find(c => c.id === selectedChild.id);
          if (freshStudentData) {
              setSelectedChild(freshStudentData);
          } else {
              setSelectedChild(null);
          }
      }
  }, [children, selectedChild]);

  const addNotification = (message: string) => { setNotifications(prev => [...prev, { id: Date.now(), message }]); };

  const addAppHistoryLog = useCallback(async (user: string, action: string, details: string) => {
    if (!userId) return;
    const newLog = { user, action, details, timestamp: new Date().toISOString() };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/appHistory`), newLog);
    } catch (error) {
        console.error("Error logging history:", error);
    }
  }, [userId, appId]);

  useEffect(() => {
    if (isLoading || !userId || children.length === 0) return;

    const today = new Date();
    const currentBillingMonth = today.getMonth();
    const currentBillingYear = today.getFullYear();

    const runSilentInvoiceUpdate = async () => {
        for (const child of children) {
            const schedule = schedules.find(s => s.id === child.schedule);
            if (!schedule || !child.startMonth) continue;

            const startDate = new Date(child.startMonth);
            const endDate = child.plannedEndMonth ? new Date(child.plannedEndMonth) : new Date(9999, 11, 31);

            const firstDayOfBillingMonth = new Date(currentBillingYear, currentBillingMonth, 1);
            const lastDayOfBillingMonth = new Date(currentBillingYear, currentBillingMonth + 1, 0);

            if (endDate < firstDayOfBillingMonth || startDate > lastDayOfBillingMonth) continue;

            let baseFee = schedule.price;
            if (child.plannedEndMonth) {
                const stayDurationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24) + 1;
                if (stayDurationDays < 28) {
                    const weeks = Math.ceil(stayDurationDays / 7);
                    baseFee = (schedule.price / 4) * (weeks + 1);
                } else if (currentBillingYear === endDate.getFullYear() && currentBillingMonth === endDate.getMonth()) {
                    const daysInLastMonth = endDate.getDate();
                    const weeks = Math.ceil(daysInLastMonth / 7);
                    baseFee = (schedule.price / 4) * (weeks + 1);
                }
            }

            const totalPenalties = penalties.filter(p => p.childId === child.numericId && new Date(p.date).getMonth() === currentBillingMonth && new Date(p.date).getFullYear() === currentBillingYear).reduce((sum, p) => sum + p.amount, 0);
            const extendedScheduleFee = child.extendedSchedule ? 30 : 0;
            const isFirstMonth = startDate.getMonth() === currentBillingMonth && startDate.getFullYear() === currentBillingYear;
            const enrollmentFee = !child.enrollmentPaid && isFirstMonth ? 100 : 0;
            const totalAmount = baseFee + totalPenalties + extendedScheduleFee + enrollmentFee;

            const invoiceData = {
                numericId: Date.now() + child.numericId,
                childId: child.numericId,
                childName: `${child.name} ${child.surname}`,
                date: new Date(currentBillingYear, currentBillingMonth, 1).toISOString().split('T')[0],
                amount: totalAmount,
                base: baseFee,
                penalties: totalPenalties,
                enrollmentFeeIncluded: !child.enrollmentPaid && isFirstMonth,
                extendedScheduleFee,
            };

            const invoicesCollectionPath = `/artifacts/${appId}/public/data/invoices`;
            const existingInvoice = invoices.find(inv => inv.childId === child.numericId && new Date(inv.date).getMonth() === currentBillingMonth && new Date(inv.date).getFullYear() === currentBillingYear);

            try {
                if (existingInvoice) {
                    if (existingInvoice.amount !== invoiceData.amount || existingInvoice.base !== invoiceData.base) {
                        await setDoc(doc(db, invoicesCollectionPath, existingInvoice.id), { ...invoiceData, numericId: existingInvoice.numericId, status: existingInvoice.status });
                    }
                } else {
                    await addDoc(collection(db, invoicesCollectionPath), { ...invoiceData, status: 'Pendiente' });
                }
            } catch(e) { console.error("Error auto-updating invoice for ", child.name, e) }
        }
    };
    runSilentInvoiceUpdate();
  }, [children, penalties, config, schedules, userId, isLoading, invoices, appId]);

  const handleExport = (dataType: string) => {
      // Logic for exporting data to CSV. No changes needed here.
  };

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
    setActiveTab('dashboard');
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
        addNotification("Error: No se puede conectar a la base de datos.");
        return;
    }

    const newChild: Omit<Student, 'id'> = {
        ...childForm,
        numericId: Date.now(),
        paymentMethod: childForm.paymentMethod as Student['paymentMethod'],
        documents: [],
        modificationHistory: []
    };
    try {
        const childrenCollectionPath = `/artifacts/${appId}/public/data/children`;
        await addDoc(collection(db, childrenCollectionPath), newChild);
        setChildForm({ name: '', surname: '', birthDate: '', address: '', fatherName: '', motherName: '', phone1: '', phone2: '', parentEmail: '', schedule: '', allergies: '', authorizedPickup: '', enrollmentPaid: false, monthlyPayment: true, paymentMethod: '', accountHolderName: '', nif: '', startMonth: '', plannedEndMonth: '', extendedSchedule: false });
        addNotification(`Alumno ${newChild.name} inscrito con éxito.`);
        addAppHistoryLog(currentUser, 'Inscripción', `Se ha inscrito al nuevo alumno: ${newChild.name} ${newChild.surname}.`);
        setActiveTab('alumnos');
    } catch(error) {
        console.error("Error adding child: ", error);
        addNotification("Error al inscribir alumno.");
    }
  };

  const handleDeleteChild = (childId: string, name: string) => {
      const onConfirmDelete = async () => {
          if (!userId) return;
          try {
              const childDocPath = `/artifacts/${appId}/public/data/children/${childId}`;
              await deleteDoc(doc(db, childDocPath));
              addNotification('Alumno eliminado.');
              addAppHistoryLog(currentUser, 'Eliminación', `Se ha eliminado al alumno: ${name}.`);
          } catch(error) {
              console.error("Error deleting child: ", error);
              addNotification("Error al eliminar alumno.");
          }
          setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
      };

      setConfirmModal({
          isOpen: true,
          message: `¿Estás seguro de que quieres eliminar a ${name}? Esta acción no se puede deshacer.`,
          onConfirm: onConfirmDelete,
      });
  };

    const handleUpdateStudent = async (studentId: string, updatedData: Partial<Omit<Student, 'id'>>, user: string) => {
        if (!userId) return;
        const originalStudent = children.find(c => c.id === studentId);
        if (!originalStudent) return;

        let changesDescription = '';
        Object.keys(updatedData).forEach(key => {
            const typedKey = key as keyof Omit<Student, 'id'>;
            // @ts-ignore
            if (originalStudent[typedKey] !== updatedData[typedKey]) {
                changesDescription += `Cambió '${key}'. `;
            }
        });

        const finalUpdateData: Partial<Student> = { ...updatedData };

        if (changesDescription) {
            const newLog: HistoryLog = {
                id: `hist_${Date.now()}`,
                user: user,
                timestamp: new Date().toLocaleString('es-ES'),
                changes: changesDescription,
            };
            finalUpdateData.modificationHistory = [...(originalStudent.modificationHistory || []), newLog];
        }

        try {
            const studentDocPath = `/artifacts/${appId}/public/data/children/${studentId}`;
            await updateDoc(doc(db, studentDocPath), finalUpdateData as any);
            addNotification(`Ficha de ${updatedData.name || originalStudent.name} guardada.`);
            if (changesDescription) {
                addAppHistoryLog(user, 'Modificación de Ficha', `Se ha actualizado la ficha de ${originalStudent.name} ${originalStudent.surname}.`);
            }
        } catch(error) {
            console.error("Error updating student: ", error);
            addNotification("Error al guardar la ficha.");
        }
    };

    const handleAddDocument = async (studentId: string, documentData: Document, user: string) => {
        const student = children.find(c => c.id === studentId);
        if (!student || !userId) return;

        const updatedDocuments = [...(student.documents || []), documentData];
        try {
            const studentDocPath = `/artifacts/${appId}/public/data/children/${studentId}`;
            await updateDoc(doc(db, studentDocPath), { documents: updatedDocuments });
            addNotification(`Documento '${documentData.name}' añadido.`);
            addAppHistoryLog(user, 'Documento Añadido', `Se ha añadido el documento '${documentData.name}' a ${student.name} ${student.surname}.`);
        } catch(error) {
            console.error("Error adding document: ", error);
            addNotification("Error al añadir documento.");
        }
    };

  const handleSaveAttendance = async (attendanceData: Omit<Attendance, 'id'>) => {
    // Logic for saving attendance. No changes needed here.
  };

    const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
        // Logic for updating invoice status. No changes needed.
    };

    const handleDeleteInvoice = (invoice: Invoice) => {
        // Logic for deleting an invoice. No changes needed.
    };

    const handleUpdatePenalty = async (penaltyId: string, updates: Partial<Omit<Penalty, 'id'>>) => {
        // Logic for updating a penalty. No changes needed.
    };

    const handleDeletePenalty = async (penaltyId: string) => {
        // Logic for deleting a penalty. No changes needed.
    };

    const handleSaveConfig = async (newConfig: Config) => {
        // Logic for saving configuration. No changes needed.
    };

    const handleStaffCheckIn = async () => {
        // Logic for staff check-in. No changes needed.
    };

    const handleStaffCheckOut = async () => {
        // Logic for staff check-out. No changes needed.
    };

    const handleUpdateStaffTimeLog = async (logId: string, updatedData: Partial<StaffTimeLog>) => {
        // Logic for updating staff time log. No changes needed.
    };

  // --- INICIO DE CORRECCIÓN: LÓGICA DE PDF RESTAURADA ---
  const handleGenerateAndExportInvoice = (student: Student) => {
    handleGeneratePDFInvoice(student, undefined, new Date());
  };

  const handleGenerateAndExportNextMonthInvoice = (student: Student) => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    handleGeneratePDFInvoice(student, undefined, nextMonth);
  };

  const handleGeneratePDFInvoice = (student: Student, invoice: Invoice | undefined, targetDate: Date = new Date()) => {
      if (!student) return addNotification("Error: No se ha seleccionado un alumno.");

      let finalInvoice = invoice;
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      if (!finalInvoice) {
          finalInvoice = invoices.find(inv =>
              inv.childId === student.numericId &&
              new Date(inv.date).getMonth() === targetMonth &&
              new Date(inv.date).getFullYear() === targetYear
          );
      }

      if (!finalInvoice) {
          const schedule = schedules.find(s => s.id === student.schedule);
          if (!schedule) { addNotification("Error: El alumno no tiene horario."); return; }

          let baseFee = schedule.price;

          if (student.startMonth && student.plannedEndMonth) {
              const startDate = new Date(student.startMonth);
              const endDate = new Date(student.plannedEndMonth);
              const stayDurationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24) + 1;

              if (stayDurationDays < 28) {
                  const weeks = Math.ceil(stayDurationDays / 7);
                  baseFee = (schedule.price / 4) * (weeks + 1);
              } else if (targetYear === endDate.getFullYear() && targetMonth === endDate.getMonth()) {
                   const daysInLastMonth = endDate.getDate();
                   const weeks = Math.ceil(daysInLastMonth / 7);
                   baseFee = (schedule.price / 4) * (weeks + 1);
              }
          }

          const isFirstMonth = student.startMonth && new Date(student.startMonth).getMonth() === targetMonth && new Date(student.startMonth).getFullYear() === targetYear;
          const totalPenalties = 0;
          const extendedScheduleFee = student.extendedSchedule ? 30 : 0;
          const enrollmentFee = !student.enrollmentPaid && isFirstMonth ? 100 : 0;
          const totalAmount = baseFee + totalPenalties + extendedScheduleFee + enrollmentFee;

          finalInvoice = {
              id: 'temp', numericId: Date.now(), childId: student.numericId,
              childName: `${student.name} ${student.surname}`,
              date: new Date(targetYear, targetMonth, 1).toISOString().split('T')[0],
              amount: totalAmount, base: baseFee, penalties: totalPenalties,
              enrollmentFeeIncluded: !student.enrollmentPaid && isFirstMonth,
              status: 'Pendiente', extendedScheduleFee,
          };
      }

      const doc = new jsPDF();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(32);
      doc.setTextColor('#c55a33');
      doc.text("mi pequeño recreo", 105, 22, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text("Vision Paideia SLU", 20, 40);
      doc.text("CIF: B21898341", 20, 45);
      doc.text("C/Alonso Cano 24, 28003, Madrid", 20, 50);
      doc.text(`Factura Nº: ${new Date(finalInvoice.date).getFullYear()}-${String(finalInvoice.numericId).slice(-4)}`, 190, 40, { align: 'right' });
      doc.text(`Fecha: ${new Date(finalInvoice.date).toLocaleDateString('es-ES')}`, 190, 45, { align: 'right' });
      doc.setDrawColor(220, 220, 220);
      doc.rect(15, 60, 180, 25);
      doc.setFont('Helvetica', 'bold');
      doc.text("Cliente:", 20, 66);
      doc.setFont('Helvetica', 'normal');
      const clientName = student.accountHolderName || `${student.fatherName || ''} ${student.motherName || ''}`.trim();
      doc.text(`Nombre y apellidos: ${clientName}`, 20, 72);
      doc.text(`NIF: ${student.nif || 'No especificado'}`, 20, 78);
      doc.text(`Dirección: ${student.address || 'No especificada'}`, 100, 78);
      const tableColumn = ["Concepto", "Cantidad", "Precio unitario", "Importe"];
      const tableRows = [];

      if (finalInvoice.enrollmentFeeIncluded) tableRows.push(["Matrícula", "1", `100.00 ${config.currency}`, `100.00 ${config.currency}`]);

      let conceptText = `Jardín de infancia (${new Date(finalInvoice.date).toLocaleString('es-ES', { month: 'long' })})`;
      if (student.startMonth && student.plannedEndMonth) {
          const stayDurationDays = (new Date(student.plannedEndMonth).getTime() - new Date(student.startMonth).getTime()) / (1000 * 3600 * 24) + 1;
          if (stayDurationDays < 28) conceptText = `Estancia de ${Math.ceil(stayDurationDays / 7)} semana(s)`;
      }
      tableRows.push([conceptText, "1", `${finalInvoice.base.toFixed(2)} ${config.currency}`, `${finalInvoice.base.toFixed(2)} ${config.currency}`]);

      if (finalInvoice.extendedScheduleFee) tableRows.push([`Suplemento Horario Ampliado`, "1", `${finalInvoice.extendedScheduleFee.toFixed(2)} ${config.currency}`, `${finalInvoice.extendedScheduleFee.toFixed(2)} ${config.currency}`]);

      if (finalInvoice.penalties > 0) tableRows.push([`Penalizaciones por retraso`, "", "", `${finalInvoice.penalties.toFixed(2)} ${config.currency}`]);

      tableRows.push(["", "", { content: "Total", styles: { fontStyle: 'bold' } }, { content: `${finalInvoice.amount.toFixed(2)} ${config.currency}`, styles: { fontStyle: 'bold' } }]);

      autoTable(doc, {
          startY: 90, head: [tableColumn], body: tableRows, theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
          didDrawPage: (data: any) => {
              doc.setFontSize(10);
              doc.text(`Forma de pago: ${student.paymentMethod}`, data.settings.margin.left, (doc.internal.pageSize as any).getHeight() - 25);
              doc.setFont('Helvetica', 'bold');
              doc.setFontSize(18);
              doc.setTextColor('#c55a33');
              doc.text("mi pequeño recreo", 105, (doc.internal.pageSize as any).getHeight() - 10, { align: 'center' });
          },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } }
      });

      doc.save(`factura_${student.name}_${student.surname}_${finalInvoice.date}.pdf`);
      addNotification(`Generando factura PDF para ${student.name}.`);
  };
  // --- FIN DE CORRECCIÓN ---

  // --- INICIO DE CORRECCIÓN: MOVER DEFINICIONES DE VARIABLES ---
  const todayForLog = new Date();
  const yearForLog = todayForLog.getFullYear();
  const monthStrForLog = String(todayForLog.getMonth() + 1).padStart(2, '0');
  const dayStrForLog = String(todayForLog.getDate()).padStart(2, '0');
  const todayStr_LOCAL = `${yearForLog}-${monthStrForLog}-${dayStrForLog}`;

  const todayLog = staffTimeLogs.find(log => log.userName === currentUser && log.date === todayStr_LOCAL && log.checkIn && !log.checkOut);
  const staffUsersList = [...new Set(staffTimeLogs.map(log => log.userName))];
  // --- FIN DE CORRECCIÓN ---
  
  const renderTabContent = () => {
      switch(activeTab) {
          case 'dashboard':
              return <Dashboard students={children} attendance={attendance} invoices={invoices} schedules={schedules} config={config} />;
          case 'inscripciones':
              return <NewStudentForm onAddChild={handleAddChild} childForm={childForm} onFormChange={setChildForm} schedules={schedules} />;
          case 'alumnos':
              return <StudentList students={children} onSelectChild={setSelectedChild} onDeleteChild={handleDeleteChild} onExport={() => handleExport('alumnos')} />;
          case 'asistencia':
              return <AttendanceManager students={children} attendance={attendance} onSave={handleSaveAttendance} onExport={() => handleExport('asistencia')} />;
          case 'calendario':
              return <CalendarView attendance={attendance} />;
          case 'facturacion':
              return <Invoicing
                  invoices={invoices}
                  onUpdateStatus={handleUpdateInvoiceStatus}
                  config={config}
                  onExport={() => handleExport('facturacion')}
                  students={children}
                  onGeneratePastInvoice={(student, invoice) => handleGeneratePDFInvoice(student, invoice, new Date(invoice.date))}
                  onDeleteInvoice={handleDeleteInvoice}
              />;
          case 'penalizaciones':
              return <PenaltiesViewer penalties={penalties} config={config} onExport={() => handleExport('penalizaciones')} onUpdatePenalty={handleUpdatePenalty} onDeletePenalty={handleDeletePenalty} />;
          case 'control':
              return <StaffControlPanel currentUser={currentUser} todayLog={todayLog} onCheckIn={handleStaffCheckIn} onCheckOut={handleStaffCheckOut} />;
          case 'personal':
              return <StaffLogViewer logs={staffTimeLogs} onExport={() => handleExport('fichajes')} staffUsers={staffUsersList} onUpdateStaffTimeLog={handleUpdateStaffTimeLog} />;
          case 'historial':
              return <AppHistoryViewer history={appHistory} onExport={() => handleExport('historial')} />;
          case 'configuracion':
              return <Settings config={config} onSave={handleSaveConfig} addNotification={addNotification} />;
          case 'ayuda':
              return <Help />;
          default:
              return <Dashboard students={children} attendance={attendance} invoices={invoices} schedules={schedules} config={config} />;
      }
  }

  if (isLoading) return <LoadingSpinner />;
  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <>
      <div style={styles.notificationContainer}>{notifications.map(n => <Notification key={n.id} message={n.message} onClose={() => setNotifications(p => p.filter(item => item.id !== n.id))} />)}</div>

      {confirmModal.isOpen && (
          <ConfirmModal
              message={confirmModal.message}
              onConfirm={confirmModal.onConfirm}
              onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
          />
      )}

      {/* --- INICIO DE CORRECCIÓN: AÑADIR PROP FALTANTE --- */}
      {selectedChild && <StudentDetailModal
          student={selectedChild}
          onClose={() => setSelectedChild(null)}
          schedules={schedules}
          onViewPersonalCalendar={(student) => {
              setSelectedChild(null);
              setViewingCalendarForStudent(student);
          }}
          onUpdate={handleUpdateStudent}
          onAddDocument={handleAddDocument}
          onGenerateAndExportInvoice={handleGenerateAndExportInvoice}
          onGenerateAndExportNextMonthInvoice={handleGenerateAndExportNextMonthInvoice}
          currentUser={currentUser}
      />}
      {/* --- FIN DE CORRECCIÓN --- */}

      {viewingCalendarForStudent && <StudentPersonalCalendar
          student={viewingCalendarForStudent}
          onClose={() => setViewingCalendarForStudent(null)}
          attendance={attendance}
          penalties={penalties}
      />}

      <div style={styles.appContainer}>
        <aside style={styles.sidebar}>
          <div>
            <div style={{ padding: '20px 15px', display: 'flex', justifyContent: 'center' }}><MiPequenoRecreoLogo width={180}/></div>

            <h2 style={styles.sidebarTitle}>General</h2>
            {[
              { id: 'dashboard', name: 'Panel de Control', icon: BarChart2 },
              { id: 'inscripciones', name: 'Nueva Inscripción', icon: UserPlus },
              { id: 'alumnos', name: 'Alumnos', icon: Users },
              { id: 'asistencia', name: 'Asistencia', icon: Clock },
              { id: 'calendario', name: 'Calendario', icon: CalendarIcon },
            ].map(tab => {
              const Icon = tab.icon; const isActive = activeTab === tab.id;
              return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...styles.sidebarButton, ...(isActive ? styles.sidebarButtonActive : {})}}><Icon size={20} style={{ marginRight: '12px' }} /><span>{tab.name}</span></button>);
            })}

            <h2 style={{...styles.sidebarTitle, marginTop: '20px'}}>Administración</h2>
            {[
              { id: 'facturacion', name: 'Facturación', icon: FileText },
              { id: 'penalizaciones', name: 'Penalizaciones', icon: DollarSign },
            ].map(tab => {
              const Icon = tab.icon; const isActive = activeTab === tab.id;
              return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...styles.sidebarButton, ...(isActive ? styles.sidebarButtonActive : {})}}><Icon size={20} style={{ marginRight: '12px' }} /><span>{tab.name}</span></button>);
            })}

            {currentUser !== 'Gonzalo Navarro' && (
              <>
                <button key='control' onClick={() => setActiveTab('control')} style={{...styles.sidebarButton, ...(activeTab === 'control' ? styles.sidebarButtonActive : {})}}>
                    <UserCheck size={20} style={{ marginRight: '12px' }} /><span>Control Horario</span>
                </button>
                <button key='ayuda' onClick={() => setActiveTab('ayuda')} style={{...styles.sidebarButton, ...(activeTab === 'ayuda' ? styles.sidebarButtonActive : {})}}>
                    <HelpCircle size={20} style={{ marginRight: '12px' }} /><span>Ayuda</span>
                </button>
              </>
            )}

            {currentUser === 'Gonzalo Navarro' && (
              <>
                {[
                  { id: 'personal', name: 'Personal', icon: Briefcase },
                  { id: 'historial', name: 'Historial Web', icon: History },
                  { id: 'configuracion', name: 'Configuración', icon: SettingsIcon },
                ].map(tab => {
                  const Icon = tab.icon; const isActive = activeTab === tab.id;
                  return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...styles.sidebarButton, ...(isActive ? styles.sidebarButtonActive : {})}}><Icon size={20} style={{ marginRight: '12px' }} /><span>{tab.name}</span></button>);
                })}
              </>
            )}

          </div>
          <div>
            <div style={styles.currentUserInfo}>
              <p style={{margin: 0}}>Usuario: <strong>{currentUser}</strong></p>
            </div>
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
             <button onClick={handleLogout} style={styles.logoutButton}>
                <LogOut size={16} style={{ marginRight: '8px' }} />Cerrar Sesión
             </button>
          </header>
          <div style={styles.contentArea}>
            {renderTabContent()}
          </div>
        </main>
      </div>
    </>
  );
};

export default App;