// Contenido para: src/context/AppContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { collection, doc, onSnapshot, query, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '../firebase/config';
import { schedules as defaultSchedules } from '../config/schedules';
import type { Student, Invoice, Attendance, Penalty, Config, Schedule, StaffTimeLog, AppHistoryLog, Document, HistoryLog } from '../types';

interface AppContextType {
  students: Student[];
  invoices: Invoice[];
  attendance: Attendance[];
  penalties: Penalty[];
  config: Config;
  schedules: Schedule[];
  staffTimeLogs: StaffTimeLog[];
  appHistory: AppHistoryLog[];
  isLoading: boolean;
  userId: string | null;
  addAppHistoryLog: (user: string, action: string, details: string) => Promise<void>;
  updateStudent: (studentId: string, updatedData: Partial<Omit<Student, 'id'>>, user: string) => Promise<void>;
  addDocument: (studentId: string, documentData: Document, user: string) => Promise<void>;
  saveAttendance: (attendanceData: Omit<Attendance, 'id'>, currentUser: string) => Promise<void>;
  updateInvoiceStatus: (invoiceId: string, newStatus: Invoice['status']) => Promise<void>;
  deleteInvoice: (invoice: Invoice, currentUser: string) => Promise<void>;
  updatePenalty: (penaltyId: string, updates: Partial<Omit<Penalty, 'id'>>, currentUser: string) => Promise<void>;
  deletePenalty: (penaltyId: string, currentUser: string) => Promise<void>;
  saveConfig: (newConfig: Config) => Promise<void>;
  staffCheckIn: (currentUser: string) => Promise<void>;
  staffCheckOut: (currentUser: string) => Promise<void>;
  updateStaffTimeLog: (logId: string, updatedData: Partial<StaffTimeLog>, currentUser: string) => Promise<void>;
  addChild: (childForm: any, currentUser: string) => Promise<boolean>;
  deleteChild: (childId: string, name: string, currentUser: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [config, setConfig] = useState<Config>({ centerName: 'mi pequeño recreo', currency: '€', lateFee: 6 });
  const [staffTimeLogs, setStaffTimeLogs] = useState<StaffTimeLog[]>([]);
  const [appHistory, setAppHistory] = useState<AppHistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const appId = 'pekemanager-app';

  const addAppHistoryLog = useCallback(async (user: string, action: string, details: string) => {
    if (!userId) return;
    const newLog = { user, action, details, timestamp: new Date().toISOString() };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/appHistory`), newLog);
    } catch (error) {
        console.error("Error logging history:", error);
    }
  }, [userId]);
  
  useEffect(() => {
    const unsubscribe = ensureAnonymousAuth( (uid) => { setUserId(uid); setIsLoading(false); }, () => { setIsLoading(false); alert("Error crítico: No se pudo conectar a la base de datos."); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const dataListeners = [
        { name: 'children', setter: setStudents }, { name: 'attendance', setter: setAttendance },
        { name: 'penalties', setter: setPenalties }, { name: 'invoices', setter: setInvoices },
        { name: 'appHistory', setter: setAppHistory }, { name: 'staffTimeLog', setter: setStaffTimeLogs },
    ];
    const unsubscribers = dataListeners.map(({ name, setter }) => onSnapshot(query(collection(db, `/artifacts/${appId}/public/data/${name}`)), (snapshot) => {
        setter(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any);
    }, (error) => console.error(`Error fetching ${name}:`, error)));
    const unsubConfig = onSnapshot(doc(db, `/artifacts/${appId}/public/data/settings/config`), (docSnap) => {
        if (docSnap.exists()) { setConfig(docSnap.data() as Config); } 
        else { setDoc(doc(db, `/artifacts/${appId}/public/data/settings/config`), config); }
    }, (error) => console.error("Error fetching config:", error));
    unsubscribers.push(unsubConfig);
    return () => unsubscribers.forEach(unsub => unsub());
  }, [userId]);

  useEffect(() => {
    if (!students.length || !userId) return;
    const today = new Date();
    if (today.getDate() === 1) {
        const lastCheck = localStorage.getItem('lastScheduleCheck');
        const todayStr = today.toISOString().split('T')[0].slice(0, 7);
        if (lastCheck === todayStr) return;
        
        students.forEach(student => {
            if (student.nextMonthSchedule) {
                const studentDocRef = doc(db, `/artifacts/${appId}/public/data/children/${student.id}`);
                updateDoc(studentDocRef, {
                    schedule: student.nextMonthSchedule,
                    nextMonthSchedule: ''
                });
                addAppHistoryLog('Sistema', 'Cambio de Horario', `Se aplicó el nuevo horario programado para ${student.name} ${student.surname}.`);
            }
        });
        localStorage.setItem('lastScheduleCheck', todayStr);
    }
  }, [students, userId, addAppHistoryLog]);

  const addChild = async (childForm: any, currentUser: string) => {
    if (!userId) return false;
    const newChild: Omit<Student, 'id'> = { ...childForm, numericId: Date.now(), paymentMethod: childForm.paymentMethod as Student['paymentMethod'], documents: [], modificationHistory: [] };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/children`), newChild);
        await addAppHistoryLog(currentUser, 'Inscripción', `Se ha inscrito al nuevo alumno: ${newChild.name} ${newChild.surname}.`);
        return true;
    } catch(error) { console.error("Error adding child: ", error); return false; }
  };

  const deleteChild = async (childId: string, name: string, currentUser: string) => {
    if (!userId) return;
    try {
        await deleteDoc(doc(db, `/artifacts/${appId}/public/data/children/${childId}`));
        await addAppHistoryLog(currentUser, 'Eliminación', `Se ha eliminado al alumno: ${name}.`);
    } catch(error) { console.error("Error deleting child: ", error); }
  };
  
  const updateStudent = async (studentId: string, updatedData: Partial<Omit<Student, 'id'>>, user: string) => {
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
        if (changesDescription) {
            await addAppHistoryLog(user, 'Modificación de Ficha', `Se ha actualizado la ficha de ${originalStudent.name} ${originalStudent.surname}.`);
        }
    } catch(error) { console.error("Error updating student: ", error); }
  };

  const addDocument = async (studentId: string, documentData: Document, user: string) => {
    const student = students.find(c => c.id === studentId);
    if (!student || !userId) return;
    const updatedDocuments = [...(student.documents || []), documentData];
    try {
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/children/${studentId}`), { documents: updatedDocuments });
        await addAppHistoryLog(user, 'Documento Añadido', `Se ha añadido el documento '${documentData.name}' a ${student.name} ${student.surname}.`);
    } catch(error) { console.error("Error adding document: ", error); }
  };

  const saveAttendance = async (attendanceData: Omit<Attendance, 'id'>, currentUser: string) => {
    if (!userId) return;
    const existingEntry = attendance.find(a => a.date === attendanceData.date && a.childId === attendanceData.childId);
    try {
        if (existingEntry) {
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/attendance`, existingEntry.id), attendanceData);
        } else {
            await addDoc(collection(db, `/artifacts/${appId}/public/data/attendance`), attendanceData);
        }
        await addAppHistoryLog(currentUser, 'Asistencia', `Se ha guardado la asistencia para ${attendanceData.childName} el ${attendanceData.date}.`);
        if (attendanceData.exitTime) {
            const child = students.find(c => c.numericId === attendanceData.childId);
            const schedule = defaultSchedules.find(s => s.id === child?.schedule);
            if (!child || !schedule) return;
            const [endH, endM] = schedule.endTime.split(':').map(Number);
            const [exitH, exitM] = attendanceData.exitTime.split(':').map(Number);
            if (exitH * 60 + exitM > endH * 60 + endM) {
                const delayMins = (exitH * 60 + exitM) - (endH * 60 + endM);
                const penaltyAmount = Math.ceil(delayMins / 15) * config.lateFee;
                if (penaltyAmount > 0) {
                    const newPenalty = { childId: child.numericId, childName: `${child.name} ${child.surname}`, date: attendanceData.date, amount: penaltyAmount, reason: `Retraso de ${delayMins} min.` };
                    await addDoc(collection(db, `/artifacts/${appId}/public/data/penalties`), newPenalty);
                    await addAppHistoryLog(currentUser, 'Penalización', `Generada penalización de ${penaltyAmount}${config.currency} para ${child.name} ${child.surname}.`);
                }
            }
        }
    } catch (error) { console.error("Error saving attendance: ", error); }
  };
  
  const updateInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status']) => { if (!userId) return; try { await updateDoc(doc(db, `/artifacts/${appId}/public/data/invoices/${invoiceId}`), { status: newStatus }); } catch(error) { console.error("Error updating invoice status: ", error); }};
  const deleteInvoice = async (invoice: Invoice, currentUser: string) => { if (!userId) return; try { await deleteDoc(doc(db, `/artifacts/${appId}/public/data/invoices/${invoice.id}`)); await addAppHistoryLog(currentUser, 'Eliminación Factura', `Se ha eliminado la factura ${invoice.numericId} de ${invoice.childName}.`); } catch(error) { console.error("Error deleting invoice: ", error); }};
  const updatePenalty = async (penaltyId: string, updates: Partial<Omit<Penalty, 'id'>>, currentUser: string) => { if (!userId) return; try { await updateDoc(doc(db, `/artifacts/${appId}/public/data/penalties/${penaltyId}`), updates); await addAppHistoryLog(currentUser, 'Actualización Penalización', `Se modificó una penalización.`); } catch (error) { console.error("Error updating penalty: ", error); }};
  const deletePenalty = async (penaltyId: string, currentUser: string) => { if (!userId) return; try { await deleteDoc(doc(db, `/artifacts/${appId}/public/data/penalties/${penaltyId}`)); await addAppHistoryLog(currentUser, 'Eliminación Penalización', `Se ha eliminado una penalización.`); } catch (error) { console.error("Error deleting penalty: ", error); }};
  const saveConfig = async (newConfig: Config) => { if (!userId) return; try { await setDoc(doc(db, `/artifacts/${appId}/public/data/settings/config`), newConfig); } catch(e) { console.error("Error saving config:", e); }};
  const staffCheckIn = async (currentUser: string) => {
    if (!userId) return;
    const newLog = { userName: currentUser, date: new Date().toISOString().split('T')[0], checkIn: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), checkOut: '' };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/staffTimeLog`), newLog);
        await addAppHistoryLog(currentUser, 'Fichaje', `Ha registrado la entrada.`);
    } catch (error) { console.error("Error clocking in: ", error); }
  };
  const staffCheckOut = async (currentUser: string) => {
    if (!userId) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLog = staffTimeLogs.find(log => log.userName === currentUser && log.date === todayStr && log.checkIn && !log.checkOut);
    if (!todayLog) { return; }
    try {
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/staffTimeLog/${todayLog.id}`), { checkOut: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) });
        await addAppHistoryLog(currentUser, 'Fichaje', `Ha registrado la salida.`);
    } catch (error) { console.error("Error clocking out: ", error); }
  };
  const updateStaffTimeLog = async (logId: string, updatedData: Partial<StaffTimeLog>, currentUser: string) => {
    if (!userId) return;
    try {
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/staffTimeLog/${logId}`), updatedData);
        await addAppHistoryLog(currentUser, 'Admin Fichaje', `Modificado registro ${logId}.`);
    } catch (error) { console.error("Error updating time log: ", error); }
  };
  
  const value = { students, invoices, attendance, penalties, config, schedules: defaultSchedules, staffTimeLogs, appHistory, isLoading, userId, addAppHistoryLog, addChild, deleteChild, updateStudent, addDocument, saveAttendance, updateInvoiceStatus, deleteInvoice, updatePenalty, deletePenalty, saveConfig, staffCheckIn, staffCheckOut, updateStaffTimeLog };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) { throw new Error('useAppContext debe ser usado dentro de un AppProvider'); }
  return context;
};