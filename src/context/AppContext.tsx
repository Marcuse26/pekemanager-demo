// Contenido para: src/context/AppContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, doc, onSnapshot, query, setDoc, updateDoc } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '../firebase/config';
import { schedules as defaultSchedules } from '../config/schedules';
import type { Student, Invoice, Attendance, Penalty, Config, Schedule, StaffTimeLog, AppHistoryLog } from '../types';

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

  const addAppHistoryLog = async (user: string, action: string, details: string) => {
    if (!userId) return;
    const newLog = { user, action, details, timestamp: new Date().toISOString() };
    try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/appHistory`), newLog);
    } catch (error) {
        console.error("Error logging history:", error);
    }
  };
  
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

  // --- LÓGICA DE CAMBIO DE HORARIO AUTOMÁTICO ---
  useEffect(() => {
    if (!students.length || !userId) return;
    const today = new Date();
    if (today.getDate() === 1) { // Solo se ejecuta el día 1 del mes
        const lastCheck = localStorage.getItem('lastScheduleCheck');
        const todayStr = today.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
        if (lastCheck === todayStr) return; // Ya se ejecutó este mes
        
        students.forEach(student => {
            if (student.nextMonthSchedule) {
                const studentDocRef = doc(db, `/artifacts/${appId}/public/data/children/${student.id}`);
                updateDoc(studentDocRef, {
                    schedule: student.nextMonthSchedule,
                    nextMonthSchedule: '' // Borramos el campo para el siguiente ciclo
                });
                addAppHistoryLog('Sistema', 'Cambio de Horario', `Se aplicó el nuevo horario programado para ${student.name} ${student.surname}.`);
            }
        });
        localStorage.setItem('lastScheduleCheck', todayStr);
    }
  }, [students, userId, addAppHistoryLog]);
  // --- FIN DE LÓGICA DE CAMBIO DE HORARIO ---

  const value = { students, invoices, attendance, penalties, config, schedules: defaultSchedules, staffTimeLogs, appHistory, isLoading, userId, addAppHistoryLog };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) { throw new Error('useAppContext debe ser usado dentro de un AppProvider'); }
  return context;
};