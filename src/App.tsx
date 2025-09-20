// Contenido para: src/App.tsx

// --- Importaciones de React y Librerías ---
import { useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

// --- Importaciones de Iconos (SOLO los que usa el Sidebar y el botón de Logout) ---
import { 
    Users, Clock, FileText, DollarSign, UserPlus, LogOut, 
    Calendar as CalendarIcon, Briefcase, BarChart2, UserCheck, 
    Settings as SettingsIcon, History 
} from 'lucide-react';

// --- Importaciones de nuestro código modularizado (Fase 3) ---
import { db, ensureAnonymousAuth } from './firebase/config'; 
import { schedules } from './config/schedules';
import { styles } from './styles';
import { convertToCSV, downloadCSV } from './utils/csvHelper';
import type { 
    Student, Attendance, Penalty, Invoice, StaffTimeLog, Config, AppHistoryLog, 
    NotificationMessage, StudentFormData, HistoryLog, Document 
} from './types';

// --- Importaciones de Componentes de UI (Fase 4) ---
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

// --- FIN DE IMPORTACIONES ---

// --- COMPONENTE PRINCIPAL DE LA APLICACIÓN (EL "SHELL" O CONTENEDOR) ---
const App = () => {
  
  // --- INICIO DE CAMBIO: Login Persistente ---
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('isLoggedIn') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return sessionStorage.getItem('currentUser') || 'invitado';
  });
  // --- FIN DE CAMBIO ---
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [viewingCalendarForStudent, setViewingCalendarForStudent] = useState<Student | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, message: string, onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  const [isLoading, setIsLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const appId = 'pekemanager-app';

  // --- DATOS Y ESTADO GLOBAL ---
  const [config, setConfig] = useState<Config>({ centerName: 'mi pequeño recreo', currency: '€', lateFee: 6 });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [children, setChildren] = useState<Student[]>([]);
  const [childForm, setChildForm] = useState<StudentFormData>({ name: '', surname: '', birthDate: '', address: '', fatherName: '', motherName: '', phone1: '', phone2: '', parentEmail: '', schedule: '', allergies: '', authorizedPickup: '', enrollmentPaid: false, monthlyPayment: true, paymentMethod: '', accountHolderName: '', nif: '', startMonth: '', plannedEndMonth: '' });
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [appHistory, setAppHistory] = useState<AppHistoryLog[]>([]);
  const [staffTimeLogs, setStaffTimeLogs] = useState<StaffTimeLog[]>([]);

  // --- INICIALIZACIÓN DE FIREBASE Y AUTH LISTENER ---
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

  // --- LISTENERS DE FIREBASE PARA DATOS EN TIEMPO REAL ---
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


  // --- LÓGICA DE NEGOCIO (HANDLERS) ---
  
  const addNotification = (message: string) => { setNotifications(prev => [...prev, { id: Date.now(), message }]); };
  
  const addAppHistoryLog = useCallback(async (user: string, action: string, details: string) => {
    if (!userId) return;
    const newLog = {
        user,
        action,
        details,
        timestamp: new Date().toLocaleString('es-ES'),
    };
    try {
        const historyCollectionPath = `/artifacts/${appId}/public/data/appHistory`;
        await addDoc(collection(db, historyCollectionPath), newLog);
    } catch (error) {
        console.error("Error logging history:", error);
    }
  }, [userId, appId]);

  // --- Lógica de Facturación Automática (CORREGIDA) ---
  useEffect(() => {
    if (isLoading || !userId || children.length === 0) return;

    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    // Lógica de actividad
    const firstDayThisMonth = new Date(year, month, 1);
    const lastDayThisMonth = new Date(year, month + 1, 0);

    const isStudentActiveThisMonth = (student: Student): boolean => {
        if (!student.startMonth) return false;
        const startDate = new Date(student.startMonth);
        const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;
        const startsBeforeOrDuringMonth = startDate <= lastDayThisMonth;
        const endsAfterOrDuringMonth = !endDate || endDate >= firstDayThisMonth;
        return startsBeforeOrDuringMonth && endsAfterOrDuringMonth;
    }

    const runSilentInvoiceUpdate = async () => {
        for (const child of children) {

            // --- ¡LA CORRECCIÓN CLAVE! ---
            // Si el alumno NO está activo este mes, no debe tener factura de este mes.
            if (!isStudentActiveThisMonth(child)) {
                continue; // Saltamos al siguiente niño
            }
            // --- FIN DE LA CORRECCIÓN ---

            const schedule = schedules.find(s => s.id === child.schedule);
            if (!schedule) continue;

            const childPenalties = penalties.filter(p => 
                p.childId === child.numericId && 
                new Date(p.date).getMonth() === month && 
                new Date(p.date).getFullYear() === year
            );
            const totalPenalties = childPenalties.reduce((sum, p) => sum + p.amount, 0);
            
            let totalAmount = schedule.price + totalPenalties;
            let enrollmentFeeApplied = false;
            
            if (!child.enrollmentPaid) { 
                totalAmount += 100;
                enrollmentFeeApplied = true;
            }
            
            const invoiceData: Omit<Invoice, 'id' | 'status'> = {
                numericId: Date.now() + child.numericId,
                childId: child.numericId,
                childName: `${child.name} ${child.surname}`,
                date: new Date().toISOString().split('T')[0],
                amount: totalAmount,
                base: schedule.price,
                penalties: totalPenalties,
                enrollmentFeeIncluded: enrollmentFeeApplied,
            };

            const invoicesCollectionPath = `/artifacts/${appId}/public/data/invoices`;
            const existingInvoice = invoices.find(inv => 
                inv.childId === child.numericId && 
                new Date(inv.date).getMonth() === month && 
                new Date(inv.date).getFullYear() === year
            );
            
            try {
                if (existingInvoice) {
                    if (existingInvoice.amount !== invoiceData.amount || 
                        existingInvoice.base !== invoiceData.base || 
                        existingInvoice.penalties !== invoiceData.penalties ||
                        existingInvoice.enrollmentFeeIncluded !== invoiceData.enrollmentFeeIncluded
                    ) {
                        await setDoc(doc(db, invoicesCollectionPath, existingInvoice.id), {
                            ...invoiceData,
                            numericId: existingInvoice.numericId,
                            status: existingInvoice.status,
                        });
                    }
                } else {
                    await addDoc(collection(db, invoicesCollectionPath), {
                        ...invoiceData,
                        status: 'Pendiente' as Invoice['status'],
                    });
                }
            } catch(e) { 
                console.error("Error auto-updating invoice for ", child.name, e)
            }
        }
    };

    runSilentInvoiceUpdate();

  }, [children, penalties, config, schedules, userId, isLoading, invoices, appId]); 


  const handleExport = (dataType: string) => {
    let dataToExport: any[] = [];
    switch (dataType) {
        case 'alumnos': 
             dataToExport = children.map(c => ({
                Nombre: c.name,
                Apellidos: c.surname,
                Fecha_Nacimiento: c.birthDate,
                Mes_Inicio: c.startMonth,
                Mes_Baja_Previsto: c.plannedEndMonth,
                Direccion: c.address,
                Padre: c.fatherName,
                Telefono_1: c.phone1,
                Madre: c.motherName,
                Telefono_2: c.phone2,
                Email: c.parentEmail,
                Horario: schedules.find(s => s.id === c.schedule)?.name || c.schedule,
                Alergias: c.allergies,
                Personas_Autorizadas: c.authorizedPickup,
                Matricula_Pagada: c.enrollmentPaid ? 'Sí' : 'No',
                Metodo_Pago: c.paymentMethod,
                Titular_Cuenta: c.accountHolderName,
                NIF_Titular: c.nif
            }));
            break;
        case 'asistencia': 
            dataToExport = attendance.map(a => ({
                Alumno: a.childName,
                Fecha: a.date,
                Hora_Entrada: a.entryTime,
                Dejado_Por: a.droppedOffBy,
                Hora_Salida: a.exitTime,
                Recogido_Por: a.pickedUpBy
            }));
            break;
        case 'facturacion': 
            dataToExport = invoices.map(i => ({
                Factura_ID: i.numericId,
                Alumno: i.childName,
                Fecha: i.date,
                Base: i.base,
                Penalizaciones: i.penalties,
                Importe_Total: i.amount,
                Estado: i.status
            }));
            break;
        case 'penalizaciones': 
            dataToExport = penalties.map(p => ({
                Alumno: p.childName,
                Fecha: p.date,
                Importe: p.amount,
                Motivo: p.reason
            }));
            break;
        case 'fichajes':
            const sortedLogs = [...staffTimeLogs].sort((a, b) => {
                const dateCompare = b.date.localeCompare(a.date);
                if (dateCompare !== 0) return dateCompare; 
                return (b.checkIn || '').localeCompare(a.checkIn || '');
            });
             dataToExport = sortedLogs.map(log => ({
                Usuario: log.userName,
                Fecha: log.date,
                Entrada: log.checkIn,
                Salida: log.checkOut
            }));
            break;
        case 'historial': 
            dataToExport = appHistory.map(h => ({
                Fecha: h.timestamp,
                Usuario: h.user,
                Accion: h.action,
                Detalles: h.details
            }));
            break;
        default: addNotification("Tipo de dato para exportar no reconocido."); return;
    }

    if (dataToExport.length === 0) {
        addNotification("No hay datos para exportar.");
        return;
    }
    
    try {
        const csv = convertToCSV(dataToExport); 
        const fileName = `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csv, fileName); 
        addNotification(`Exportando ${dataType} a CSV.`);
    } catch (error) {
        console.error("Error exporting to CSV:", error);
        addNotification("Ocurrió un error al exportar los datos.");
    }
  };

  // --- INICIO DE CAMBIO: Login Persistente ---
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
  // --- FIN DE CAMBIO ---

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
        setChildForm({ name: '', surname: '', birthDate: '', address: '', fatherName: '', motherName: '', phone1: '', phone2: '', parentEmail: '', schedule: '', allergies: '', authorizedPickup: '', enrollmentPaid: false, monthlyPayment: true, paymentMethod: '', accountHolderName: '', nif: '', startMonth: '', plannedEndMonth: '' });
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
    if (!userId) return;
    const existingEntry = attendance.find(a => a.date === attendanceData.date && a.childId === attendanceData.childId);
    
    try {
        const attendanceCollectionPath = `/artifacts/${appId}/public/data/attendance`;
        if (existingEntry) {
            await updateDoc(doc(db, attendanceCollectionPath, existingEntry.id), attendanceData);
        } else {
            await addDoc(collection(db, attendanceCollectionPath), attendanceData);
        }

        addNotification(`Asistencia de ${attendanceData.childName} guardada.`);
        addAppHistoryLog(currentUser, 'Asistencia', `Se ha guardado la asistencia para ${attendanceData.childName} el ${attendanceData.date}.`);
        
        if (attendanceData.exitTime) {
            const child = children.find(c => c.numericId === attendanceData.childId);
            const schedule = schedules.find(s => s.id === child?.schedule); 
            if (!child || !schedule) return;
            const [endH, endM] = schedule.endTime.split(':').map(Number);
            const [exitH, exitM] = attendanceData.exitTime.split(':').map(Number);
            const endMins = endH * 60 + endM;
            const exitMins = exitH * 60 + exitM;
            if (exitMins > endMins) {
                const delayMins = exitMins - endMins;
                const penaltyAmount = Math.ceil(delayMins / 15) * config.lateFee; 
                if (penaltyAmount > 0) {
                    const newPenalty = { childId: child.numericId, childName: `${child.name} ${child.surname}`, date: attendanceData.date, amount: penaltyAmount, reason: `Retraso de ${delayMins} min.` };
                    const penaltiesCollectionPath = `/artifacts/${appId}/public/data/penalties`;
                    await addDoc(collection(db, penaltiesCollectionPath), newPenalty);
                    addNotification(`Penalización de ${penaltyAmount}${config.currency} añadida para ${child.name}.`);
                    addAppHistoryLog(currentUser, 'Penalización', `Generada penalización de ${penaltyAmount}${config.currency} para ${child.name} ${child.surname}.`);
                }
            }
        }
    } catch (error) {
        console.error("Error saving attendance: ", error);
        addNotification("Error al guardar asistencia.");
    }
  };

    const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
        if (!userId) return;
        try {
            const invoiceDocPath = `/artifacts/${appId}/public/data/invoices/${invoiceId}`;
            await updateDoc(doc(db, invoiceDocPath), { status: newStatus });
            addNotification("Estado de factura actualizado.");
        } catch(error) {
            console.error("Error updating invoice status: ", error);
            addNotification("Error al actualizar factura.");
        }
    };

    const handleDeleteInvoice = (invoice: Invoice) => {
        const onConfirmDelete = async () => {
            if (!userId) return;
            try {
                const invoiceDocPath = `/artifacts/${appId}/public/data/invoices/${invoice.id}`;
                await deleteDoc(doc(db, invoiceDocPath));
                addNotification(`Factura de ${invoice.childName} eliminada.`);
                addAppHistoryLog(currentUser, 'Eliminación Factura', `Se ha eliminado la factura ${invoice.numericId} de ${invoice.childName}.`);
            } catch(error) {
                console.error("Error deleting invoice: ", error);
                addNotification("Error al eliminar la factura.");
            }
            setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        };

        setConfirmModal({
            isOpen: true,
            message: `¿Estás seguro de que quieres eliminar esta factura de ${invoice.amount}${config.currency} para ${invoice.childName}? Esta acción no se puede deshacer.`,
            onConfirm: onConfirmDelete,
        });
    };

    const handleUpdatePenalty = async (penaltyId: string, updates: Partial<Omit<Penalty, 'id'>>) => {
        if (!userId) return;
        try {
            const penaltyDocPath = `/artifacts/${appId}/public/data/penalties/${penaltyId}`;
            await updateDoc(doc(db, penaltyDocPath), updates);
            addNotification("Penalización actualizada con éxito.");
            addAppHistoryLog(currentUser, 'Actualización Penalización', `Se modificó una penalización.`);
        } catch (error) {
            console.error("Error updating penalty: ", error);
            addNotification("Error al actualizar la penalización.");
        }
    };

    const handleDeletePenalty = async (penaltyId: string) => {
        if (!userId) return;
        try {
            const penaltyDocPath = `/artifacts/${appId}/public/data/penalties/${penaltyId}`;
            await deleteDoc(doc(db, penaltyDocPath));
            addNotification("Penalización eliminada.");
            addAppHistoryLog(currentUser, 'Eliminación Penalización', `Se ha eliminado una penalización.`);
        } catch (error) {
            console.error("Error deleting penalty: ", error);
            addNotification("Error al eliminar la penalización.");
        }
    };

    const handleSaveConfig = async (newConfig: Config) => {
        if (!userId) return;
        try {
            const configDocPath = `/artifacts/${appId}/public/data/settings/config`;
            await setDoc(doc(db, configDocPath), newConfig);
        } catch(e) {
            console.error("Error saving config:", e);
            addNotification("Error al guardar la configuración.")
        }
    };
    
    const handleStaffCheckIn = async () => {
        if (!userId || !currentUser) return;
        
        const today = new Date(); 
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); 
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        const checkInTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const newLog: Omit<StaffTimeLog, 'id'> = {
            userName: currentUser,
            date: todayStr, 
            checkIn: checkInTime,
            checkOut: '', 
        };

        try {
            const logCollectionPath = `/artifacts/${appId}/public/data/staffTimeLog`;
            await addDoc(collection(db, logCollectionPath), newLog);
            addNotification(`Entrada registrada a las ${checkInTime}.`);
            addAppHistoryLog(currentUser, 'Fichaje', `Ha registrado la entrada.`);
        } catch (error) {
            console.error("Error clocking in: ", error);
            addNotification("Error al registrar la entrada.");
        }
    };

    const handleStaffCheckOut = async () => {
        if (!userId || !currentUser) return;

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        const checkOutTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const todayLog = staffTimeLogs.find(log => log.userName === currentUser && log.date === todayStr && log.checkIn && !log.checkOut);

        if (!todayLog) {
            addNotification("Error: Debes registrar la ENTRADA antes de la SALIDA.");
            return;
        }

        try {
            const logDocPath = `/artifacts/${appId}/public/data/staffTimeLog/${todayLog.id}`;
            await updateDoc(doc(db, logDocPath), { checkOut: checkOutTime });
            addNotification(`Salida registrada a las ${checkOutTime}.`);
            addAppHistoryLog(currentUser, 'Fichaje', `Ha registrado la salida.`);
        } catch (error) {
            console.error("Error clocking out: ", error);
            addNotification("Error al registrar la salida.");
        }
    };

    const handleUpdateStaffTimeLog = async (logId: string, updatedData: Partial<StaffTimeLog>) => {
        if (!userId) return;
        const logDocPath = `/artifacts/${appId}/public/data/staffTimeLog/${logId}`;
        try {
            await updateDoc(doc(db, logDocPath), updatedData);
            addNotification("Registro de fichaje actualizado.");
            addAppHistoryLog(currentUser, 'Admin Fichaje', `Modificado registro ${logId}.`);
        } catch (error) {
            console.error("Error updating time log: ", error);
            addNotification("Error al actualizar el fichaje.");
        }
    };

  const handleGenerateAndExportInvoice = async (student: Student) => {
        const month = new Date().getMonth();
        const year = new Date().getFullYear();
        let invoiceToExport = invoices.find(inv => inv.childId === student.numericId && new Date(inv.date).getMonth() === month && new Date(inv.date).getFullYear() === year);

        if (!invoiceToExport) {
            addNotification("No se encontró factura del mes actual. Generando una nueva...");
            const schedule = schedules.find(s => s.id === student.schedule);
            if (!schedule) {
                addNotification("Error: El alumno no tiene un horario asignado.");
                return;
            }
            const childPenalties = penalties.filter(p => p.childId === student.numericId && new Date(p.date).getMonth() === month && new Date(p.date).getFullYear() === year);
            const totalPenalties = childPenalties.reduce((sum, p) => sum + p.amount, 0);
            let totalAmount = schedule.price + totalPenalties;
            let enrollmentFeeApplied = false;
            
            if (!student.enrollmentPaid) { 
                totalAmount += 100; 
                enrollmentFeeApplied = true;
            }

            const newInvoiceData: Omit<Invoice, 'id'> = {
                numericId: Date.now() + student.numericId,
                childId: student.numericId,
                childName: `${student.name} ${student.surname}`,
                date: new Date().toISOString().split('T')[0],
                amount: totalAmount,
                base: schedule.price,
                penalties: totalPenalties,
                enrollmentFeeIncluded: enrollmentFeeApplied,
                status: 'Pendiente',
            };
            
            try {
                const invoicesCollectionPath = `/artifacts/${appId}/public/data/invoices`;
                const docRef = await addDoc(collection(db, invoicesCollectionPath), newInvoiceData);
                invoiceToExport = { ...newInvoiceData, id: docRef.id }; 
                addAppHistoryLog(currentUser, 'Factura Individual', `Generada factura para ${student.name}`);
            } catch (error) {
                addNotification("Error al crear la nueva factura.");
                console.error("Error creating new invoice:", error);
                return;
            }
        }
        
        handleGeneratePDFInvoice(student, invoiceToExport);
    };

    const handleGeneratePDFInvoice = (student: Student, invoice: Invoice | undefined) => {
        if (!student || !invoice) {
            addNotification("Error: Faltan datos del alumno o de la factura para generar el PDF.");
            return;
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
        doc.text(`Factura Nº: ${new Date(invoice.date).getFullYear()}-${String(invoice.numericId).slice(-4)}`, 190, 40, { align: 'right' });
        doc.text(`Fecha: ${new Date(invoice.date).toLocaleDateString('es-ES')}`, 190, 45, { align: 'right' });
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
        if (invoice.enrollmentFeeIncluded) {
            tableRows.push(["Matrícula", "1", `100.00 ${config.currency}`, `100.00 ${config.currency}`]);
        }
        tableRows.push([`Jardín de infancia (${new Date(invoice.date).toLocaleString('es-ES', { month: 'long' })})`, "1", `${invoice.base.toFixed(2)} ${config.currency}`, `${invoice.base.toFixed(2)} ${config.currency}`]);
        if(invoice.penalties > 0) {
            tableRows.push([`Penalizaciones por retraso`, "", "", `${invoice.penalties.toFixed(2)} ${config.currency}`]);
        }
        tableRows.push(["", "", { content: "Total", styles: { fontStyle: 'bold' } } as any, { content: `${invoice.amount.toFixed(2)} ${config.currency}`, styles: { fontStyle: 'bold' } } as any]);
        autoTable(doc, {
            startY: 90,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            didDrawPage: (data: any) => {
                doc.setFontSize(10);
                doc.text(`Forma de pago: ${student.paymentMethod}`, data.settings.margin.left, (doc.internal.pageSize || {getHeight: () => 0}).getHeight() - 25);
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(18);
                doc.setTextColor('#c55a33');
                doc.text("mi pequeño recreo", 105, (doc.internal.pageSize || {getHeight: () => 0}).getHeight() - 10, { align: 'center' });
            },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right' },
            }
        });
        
        doc.save(`factura_${student.name}_${student.surname}_${invoice.date}.pdf`);
        addNotification(`Generando factura PDF para ${student.name}.`);
    };


  // --- RENDERIZADO PRINCIPAL (EL SHELL) ---
  const today = new Date();
  const year = today.getFullYear();
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const dayStr = String(today.getDate()).padStart(2, '0');
  const todayStr_LOCAL = `${year}-${monthStr}-${dayStr}`;

  const todayLog = staffTimeLogs.find(log => log.userName === currentUser && log.date === todayStr_LOCAL && log.checkIn && !log.checkOut);
  const staffUsersList = [...new Set(staffTimeLogs.map(log => log.userName))];

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
                  onGeneratePastInvoice={handleGeneratePDFInvoice}
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
          currentUser={currentUser}
      />}
      
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

            {currentUser !== 'gonzalo' && (
                <button key='control' onClick={() => setActiveTab('control')} style={{...styles.sidebarButton, ...(activeTab === 'control' ? styles.sidebarButtonActive : {})}}>
                    <UserCheck size={20} style={{ marginRight: '12px' }} /><span>Control Horario</span>
                </button>
            )}

            {currentUser === 'gonzalo' && (
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
            <h1 style={styles.headerTitle}>{activeTab === 'inscripciones' ? 'Nueva Inscripción' : activeTab === 'control' ? 'Control Horario' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
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