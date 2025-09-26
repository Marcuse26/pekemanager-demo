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
import type { Student, Invoice, StaffTimeLog, Config, Attendance, NotificationMessage, StudentFormData, HistoryLog, Document, Penalty } from './types';

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
  const { students, attendance, invoices, penalties, config, schedules, staffTimeLogs, appHistory, isLoading, userId } = useAppContext();
  
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
    if (isLoading || !userId || students.length === 0) return;
    const currentBillingMonth = new Date().getMonth();
    const currentBillingYear = new Date().getFullYear();
    const firstDayThisMonth = new Date(currentBillingYear, currentBillingMonth, 1);
    const lastDayThisMonth = new Date(currentBillingYear, currentBillingMonth + 1, 0);

    const isStudentActiveThisMonth = (student: Student): boolean => {
        if (!student.startMonth) return false;
        const startDate = new Date(student.startMonth);
        const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;
        return startDate <= lastDayThisMonth && (!endDate || endDate >= firstDayThisMonth);
    }

    const runSilentInvoiceUpdate = async () => {
        for (const child of students) {
            if (!isStudentActiveThisMonth(child)) continue;
            const schedule = schedules.find(s => s.id === child.schedule);
            if (!schedule) continue;
            let baseFee = schedule.price;
            if (child.startMonth && child.plannedEndMonth) {
                const startDate = new Date(child.startMonth);
                const endDate = new Date(child.plannedEndMonth);
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
            const childPenalties = penalties.filter(p => p.childId === child.numericId && new Date(p.date).getMonth() === currentBillingMonth && new Date(p.date).getFullYear() === currentBillingYear);
            const totalPenalties = childPenalties.reduce((sum, p) => sum + p.amount, 0);
            const extendedScheduleFee = child.extendedSchedule ? 30 : 0;
            let totalAmount = baseFee + totalPenalties + extendedScheduleFee;
            let enrollmentFeeApplied = !child.enrollmentPaid;
            if (enrollmentFeeApplied) totalAmount += 100;

            const invoiceData: Omit<Invoice, 'id' | 'status'> = {
                numericId: Date.now() + child.numericId,
                childId: child.numericId,
                childName: `${child.name} ${child.surname}`,
                date: new Date().toISOString().split('T')[0],
                amount: totalAmount,
                base: baseFee,
                penalties: totalPenalties,
                enrollmentFeeIncluded: enrollmentFeeApplied,
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
                    await addDoc(collection(db, invoicesCollectionPath), { ...invoiceData, status: 'Pendiente' as Invoice['status'] });
                }
            } catch(e) { console.error("Error auto-updating invoice for ", child.name, e) }
        }
    };
    runSilentInvoiceUpdate();
  }, [students, penalties, config, schedules, userId, isLoading, invoices, appId]);
  
  const handleExport = (dataType: string) => {
    let dataToExport: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
            dataToExport = [...students]
                .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`))
                .map(c => ({
                    Estado: isStudentActiveThisMonth(c) ? 'Activo' : 'Inactivo',
                    Nombre: c.name, Apellidos: c.surname, Fecha_Nacimiento: c.birthDate, Mes_Inicio: c.startMonth,
                    Mes_Baja_Previsto: c.plannedEndMonth, Direccion: c.address, Padre: c.fatherName, Telefono_1: c.phone1,
                    Madre: c.motherName, Telefono_2: c.phone2, Email: c.parentEmail,
                    Horario: schedules.find(s => s.id === c.schedule)?.name || c.schedule,
                    Alergias: c.allergies, Personas_Autorizadas: c.authorizedPickup,
                    Matricula_Pagada: c.enrollmentPaid ? 'Sí' : 'No', Metodo_Pago: c.paymentMethod,
                    Titular_Cuenta: c.accountHolderName, NIF_Titular: c.nif
                }));
            break;
        case 'asistencia':
            dataToExport = [...attendance]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(a => ({ Alumno: a.childName, Fecha: a.date, Hora_Entrada: a.entryTime, Dejado_Por: a.droppedOffBy, Hora_Salida: a.exitTime, Recogido_Por: a.pickedUpBy }));
            break;
        case 'facturacion':
            const activeStudentIds = new Set(students.filter(isStudentActiveThisMonth).map(c => c.numericId));
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            dataToExport = invoices
                .filter(inv => {
                    const invDate = new Date(inv.date);
                    return activeStudentIds.has(inv.childId) && invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
                })
                .sort((a, b) => a.childName.localeCompare(b.childName))
                .map(i => ({ Factura_ID: i.numericId, Alumno: i.childName, Base: i.base, Penalizaciones: i.penalties, Importe_Total: i.amount, Estado: i.status }));
            break;
        case 'penalizaciones':
            dataToExport = [...penalties]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(p => ({ Alumno: p.childName, Fecha: p.date, Importe: p.amount, Motivo: p.reason }));
            break;
        case 'fichajes':
            dataToExport = [...staffTimeLogs]
                .sort((a, b) => {
                    const dateCompare = b.date.localeCompare(a.date);
                    if (dateCompare !== 0) return dateCompare;
                    return (b.checkIn || '').localeCompare(a.checkIn || '');
                })
                .map(log => ({ Usuario: log.userName, Fecha: log.date, Entrada: log.checkIn, Salida: log.checkOut }));
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
            dataToExport = [...appHistory]
                .sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp))
                .map(h => ({ Fecha: h.timestamp ? new Date(parseTimestamp(h.timestamp)).toLocaleString('es-ES') : 'N/A', Usuario: h.user, Accion: h.action, Detalles: h.details }));
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
    if (!userId) { addNotification("Error: No se puede conectar a la base de datos."); return; }
    const newChild: Omit<Student, 'id'> = { ...childForm, numericId: Date.now(), paymentMethod: childForm.paymentMethod as Student['paymentMethod'], documents: [], modificationHistory: [] };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/children`), newChild);
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
              await deleteDoc(doc(db, `/artifacts/${appId}/public/data/children/${childId}`));
              addNotification('Alumno eliminado.');
              addAppHistoryLog(currentUser, 'Eliminación', `Se ha eliminado al alumno: ${name}.`);
          } catch(error) {
              console.error("Error deleting child: ", error);
              addNotification("Error al eliminar alumno.");
          }
          setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
      };
      setConfirmModal({ isOpen: true, message: `¿Estás seguro de que quieres eliminar a ${name}? Esta acción no se puede deshacer.`, onConfirm: onConfirmDelete });
  };

    const handleUpdateStudent = async (studentId: string, updatedData: Partial<Omit<Student, 'id'>>, user: string) => {
        if (!userId) return;
        const originalStudent = students.find(c => c.id === studentId);
        if (!originalStudent) return;
        let changesDescription = Object.keys(updatedData).reduce((acc, key) => {
            const typedKey = key as keyof Omit<Student, 'id'>;
            // @ts-ignore
            return originalStudent[typedKey] !== updatedData[typedKey] ? acc + `Cambió '${key}'. ` : acc;
        }, '');
        const finalUpdateData: Partial<Student> = { ...updatedData };
        if (changesDescription) {
            const newLog: HistoryLog = { id: `hist_${Date.now()}`, user, timestamp: new Date().toLocaleString('es-ES'), changes: changesDescription };
            finalUpdateData.modificationHistory = [...(originalStudent.modificationHistory || []), newLog];
        }
        try {
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/children/${studentId}`), finalUpdateData as any);
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
        const student = students.find(c => c.id === studentId);
        if (!student || !userId) return;
        const updatedDocuments = [...(student.documents || []), documentData];
        try {
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/children/${studentId}`), { documents: updatedDocuments });
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
            const child = students.find(c => c.numericId === attendanceData.childId);
            const schedule = schedules.find(s => s.id === child?.schedule);
            if (!child || !schedule) return;
            const [endH, endM] = schedule.endTime.split(':').map(Number);
            const [exitH, exitM] = attendanceData.exitTime.split(':').map(Number);
            if (exitH * 60 + exitM > endH * 60 + endM) {
                const delayMins = (exitH * 60 + exitM) - (endH * 60 + endM);
                const penaltyAmount = Math.ceil(delayMins / 15) * config.lateFee;
                if (penaltyAmount > 0) {
                    const newPenalty = { childId: child.numericId, childName: `${child.name} ${child.surname}`, date: attendanceData.date, amount: penaltyAmount, reason: `Retraso de ${delayMins} min.` };
                    await addDoc(collection(db, `/artifacts/${appId}/public/data/penalties`), newPenalty);
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
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/invoices/${invoiceId}`), { status: newStatus });
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
                await deleteDoc(doc(db, `/artifacts/${appId}/public/data/invoices/${invoice.id}`));
                addNotification(`Factura de ${invoice.childName} eliminada.`);
                addAppHistoryLog(currentUser, 'Eliminación Factura', `Se ha eliminado la factura ${invoice.numericId} de ${invoice.childName}.`);
            } catch(error) {
                console.error("Error deleting invoice: ", error);
                addNotification("Error al eliminar la factura.");
            }
            setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        };
        setConfirmModal({ isOpen: true, message: `¿Estás seguro de que quieres eliminar esta factura de ${invoice.amount}${config.currency} para ${invoice.childName}?`, onConfirm: onConfirmDelete });
    };

    const handleUpdatePenalty = async (penaltyId: string, updates: Partial<Omit<Penalty, 'id'>>) => {
        if (!userId) return;
        try {
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/penalties/${penaltyId}`), updates);
            addNotification("Penalización actualizada.");
            addAppHistoryLog(currentUser, 'Actualización Penalización', `Se modificó una penalización.`);
        } catch (error) {
            console.error("Error updating penalty: ", error);
            addNotification("Error al actualizar la penalización.");
        }
    };

    const handleDeletePenalty = async (penaltyId: string) => {
        if (!userId) return;
        try {
            await deleteDoc(doc(db, `/artifacts/${appId}/public/data/penalties/${penaltyId}`));
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
            await setDoc(doc(db, `/artifacts/${appId}/public/data/settings/config`), newConfig);
            addNotification("Configuración guardada.");
        } catch(e) {
            console.error("Error saving config:", e);
            addNotification("Error al guardar la configuración.")
        }
    };

    const handleStaffCheckIn = async () => {
        if (!userId || !currentUser) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const checkInTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const newLog: Omit<StaffTimeLog, 'id'> = { userName: currentUser, date: todayStr, checkIn: checkInTime, checkOut: '' };
        try {
            await addDoc(collection(db, `/artifacts/${appId}/public/data/staffTimeLog`), newLog);
            addNotification(`Entrada registrada a las ${checkInTime}.`);
            addAppHistoryLog(currentUser, 'Fichaje', `Ha registrado la entrada.`);
        } catch (error) {
            console.error("Error clocking in: ", error);
            addNotification("Error al registrar la entrada.");
        }
    };

    const handleStaffCheckOut = async () => {
        if (!userId || !currentUser) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const checkOutTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const todayLog = staffTimeLogs.find(log => log.userName === currentUser && log.date === todayStr && log.checkIn && !log.checkOut);
        if (!todayLog) { addNotification("Error: Debes registrar la ENTRADA antes de la SALIDA."); return; }
        try {
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/staffTimeLog/${todayLog.id}`), { checkOut: checkOutTime });
            addNotification(`Salida registrada a las ${checkOutTime}.`);
            addAppHistoryLog(currentUser, 'Fichaje', `Ha registrado la salida.`);
        } catch (error) {
            console.error("Error clocking out: ", error);
            addNotification("Error al registrar la salida.");
        }
    };

    const handleUpdateStaffTimeLog = async (logId: string, updatedData: Partial<StaffTimeLog>) => {
        if (!userId) return;
        try {
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/staffTimeLog/${logId}`), updatedData);
            addNotification("Registro de fichaje actualizado.");
            addAppHistoryLog(currentUser, 'Admin Fichaje', `Modificado registro ${logId}.`);
        } catch (error) {
            console.error("Error updating time log: ", error);
            addNotification("Error al actualizar el fichaje.");
        }
    };
  
  const handleGeneratePDFInvoice = (student: Student) => {
        if (!student) { addNotification("Error: No se ha seleccionado un alumno."); return; }
        const targetMonth = new Date().getMonth();
        const targetYear = new Date().getFullYear();
        let finalInvoice = invoices.find(inv => inv.childId === student.numericId && new Date(inv.date).getMonth() === targetMonth && new Date(inv.date).getFullYear() === targetYear);
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
                }
            }
            const totalPenalties = 0;
            const extendedScheduleFee = student.extendedSchedule ? 30 : 0;
            const enrollmentFee = !student.enrollmentPaid ? 100 : 0;
            const totalAmount = baseFee + totalPenalties + extendedScheduleFee + enrollmentFee;
            finalInvoice = { id: 'temp', numericId: Date.now(), childId: student.numericId, childName: `${student.name} ${student.surname}`, date: new Date().toISOString().split('T')[0], amount: totalAmount, base: baseFee, penalties: totalPenalties, enrollmentFeeIncluded: !student.enrollmentPaid, status: 'Pendiente', extendedScheduleFee };
        }
        const docPDF = new jsPDF();
        docPDF.setFont('Helvetica', 'bold');
        docPDF.setFontSize(32);
        docPDF.setTextColor('#c55a33');
        docPDF.text("mi pequeño recreo", 105, 22, { align: 'center' });
        docPDF.setFont('Helvetica', 'normal');
        docPDF.setFontSize(10);
        docPDF.setTextColor(40, 40, 40);
        docPDF.text("Vision Paideia SLU", 20, 40);
        docPDF.text("CIF: B21898341", 20, 45);
        docPDF.text("C/Alonso Cano 24, 28003, Madrid", 20, 50);
        docPDF.text(`Factura Nº: ${new Date(finalInvoice.date).getFullYear()}-${String(finalInvoice.numericId).slice(-4)}`, 190, 40, { align: 'right' });
        docPDF.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 190, 45, { align: 'right' });
        docPDF.setDrawColor(220, 220, 220);
        docPDF.rect(15, 60, 180, 25);
        docPDF.setFont('Helvetica', 'bold');
        docPDF.text("Cliente:", 20, 66);
        docPDF.setFont('Helvetica', 'normal');
        const clientName = student.accountHolderName || `${student.fatherName || ''} ${student.motherName || ''}`.trim();
        docPDF.text(`Nombre y apellidos: ${clientName}`, 20, 72);
        docPDF.text(`NIF: ${student.nif || 'No especificado'}`, 20, 78);
        docPDF.text(`Dirección: ${student.address || 'No especificada'}`, 100, 78);
        const tableColumn = ["Concepto", "Cantidad", "Precio unitario", "Importe"];
        const tableRows = [];
        if (finalInvoice.enrollmentFeeIncluded) tableRows.push(["Matrícula", "1", `100.00 ${config.currency}`, `100.00 ${config.currency}`]);
        let conceptText = `Jardín de infancia (${new Date(finalInvoice.date).toLocaleString('es-ES', { month: 'long' })})`;
        if (student.startMonth && student.plannedEndMonth) {
            const startDate = new Date(student.startMonth);
            const endDate = new Date(student.plannedEndMonth);
            const stayDurationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24) + 1;
            if (stayDurationDays < 28) {
                const weeks = Math.ceil(stayDurationDays / 7);
                conceptText = `Estancia de ${weeks} semana(s)`;
            }
        }
        tableRows.push([conceptText, "1", `${finalInvoice.base.toFixed(2)} ${config.currency}`, `${finalInvoice.base.toFixed(2)} ${config.currency}`]);
        if (finalInvoice.extendedScheduleFee && finalInvoice.extendedScheduleFee > 0) tableRows.push([`Suplemento Horario Ampliado`, "1", `${finalInvoice.extendedScheduleFee.toFixed(2)} ${config.currency}`, `${finalInvoice.extendedScheduleFee.toFixed(2)} ${config.currency}`]);
        if(finalInvoice.penalties > 0) tableRows.push([`Penalizaciones por retraso`, "", "", `${finalInvoice.penalties.toFixed(2)} ${config.currency}`]);
        tableRows.push(["", "", { content: "Total", styles: { fontStyle: 'bold' } } as any, { content: `${finalInvoice.amount.toFixed(2)} ${config.currency}`, styles: { fontStyle: 'bold' } } as any]);
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
        docPDF.save(`factura_${student.name}_${student.surname}_${finalInvoice.date}.pdf`);
        addNotification(`Generando factura PDF para ${student.name}.`);
    };

    const handleGenerateNextMonthPDFInvoice = (student: Student) => {
        if (!student) { addNotification("Error: No se ha seleccionado un alumno."); return; }
        const today = new Date();
        const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const schedule = schedules.find(s => s.id === student.schedule);
        if (!schedule) { addNotification("Error: El alumno no tiene horario."); return; }
        const baseFee = schedule.price;
        const extendedScheduleFee = student.extendedSchedule ? 30 : 0;
        const totalAmount = baseFee + extendedScheduleFee;
        const finalInvoice: Invoice = {
            id: 'temp_next', numericId: Date.now(), childId: student.numericId, childName: `${student.name} ${student.surname}`,
            date: new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1).toISOString().split('T')[0],
            amount: totalAmount, base: baseFee, penalties: 0, enrollmentFeeIncluded: false, status: 'Pendiente', extendedScheduleFee,
        };
        const docPDF = new jsPDF();
        docPDF.setFont('Helvetica', 'bold'); docPDF.setFontSize(32); docPDF.setTextColor('#c55a33');
        docPDF.text("mi pequeño recreo", 105, 22, { align: 'center' });
        docPDF.setFont('Helvetica', 'normal'); docPDF.setFontSize(10); docPDF.setTextColor(40, 40, 40);
        docPDF.text("Vision Paideia SLU", 20, 40); docPDF.text("CIF: B21898341", 20, 45); docPDF.text("C/Alonso Cano 24, 28003, Madrid", 20, 50);
        docPDF.text(`Factura Nº: ${new Date(finalInvoice.date).getFullYear()}-${String(finalInvoice.numericId).slice(-4)}`, 190, 40, { align: 'right' });
        docPDF.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 190, 45, { align: 'right' });
        docPDF.setDrawColor(220, 220, 220); docPDF.rect(15, 60, 180, 25);
        docPDF.setFont('Helvetica', 'bold'); docPDF.text("Cliente:", 20, 66); docPDF.setFont('Helvetica', 'normal');
        const clientName = student.accountHolderName || `${student.fatherName || ''} ${student.motherName || ''}`.trim();
        docPDF.text(`Nombre y apellidos: ${clientName}`, 20, 72); docPDF.text(`NIF: ${student.nif || 'No especificado'}`, 20, 78); docPDF.text(`Dirección: ${student.address || 'No especificada'}`, 100, 78);
        const tableColumn = ["Concepto", "Cantidad", "Precio unitario", "Importe"];
        const tableRows = [];
        tableRows.push([`Jardín de infancia (${nextMonthDate.toLocaleString('es-ES', { month: 'long' })})`, "1", `${finalInvoice.base.toFixed(2)} ${config.currency}`, `${finalInvoice.base.toFixed(2)} ${config.currency}`]);
        if (finalInvoice.extendedScheduleFee && finalInvoice.extendedScheduleFee > 0) tableRows.push([`Suplemento Horario Ampliado`, "1", `${finalInvoice.extendedScheduleFee.toFixed(2)} ${config.currency}`, `${finalInvoice.extendedScheduleFee.toFixed(2)} ${config.currency}`]);
        tableRows.push(["", "", { content: "Total", styles: { fontStyle: 'bold' } } as any, { content: `${finalInvoice.amount.toFixed(2)} ${config.currency}`, styles: { fontStyle: 'bold' } } as any]);
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
        docPDF.save(`factura_adelantada_${student.name}_${student.surname}_${finalInvoice.date}.pdf`);
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
        const baseFee = schedule.price;
        const extendedScheduleFee = student.extendedSchedule ? 30 : 0;
        const totalAmount = monthsToInvoice.length * (baseFee + extendedScheduleFee);
        const conceptMonths = monthsToInvoice.map(d => d.toLocaleString('es-ES', { month: 'long', year: 'numeric' })).join(', ');

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
        const tableRows = [];
        tableRows.push([ `Cuotas de meses anteriores (${conceptMonths})`, "1", `${totalAmount.toFixed(2)} ${config.currency}`, `${totalAmount.toFixed(2)} ${config.currency}` ]);
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