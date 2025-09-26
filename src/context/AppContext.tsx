// Contenido para: src/context/AppContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, doc, onSnapshot, query, setDoc } from 'firebase/firestore';
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

  // Autenticación anónima
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

  // Listeners de Firebase
  useEffect(() => {
    if (!userId) return;

    const dataListeners = [
        { name: 'children', setter: setStudents },
        { name: 'attendance', setter: setAttendance },
        { name: 'penalties', setter: setPenalties },
        { name: 'invoices', setter: setInvoices },
        { name: 'appHistory', setter: setAppHistory },
        { name: 'staffTimeLog', setter: setStaffTimeLogs },
    ];

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

  const value = {
    students,
    invoices,
    attendance,
    penalties,
    config,
    schedules: defaultSchedules,
    staffTimeLogs,
    appHistory,
    isLoading,
    userId
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext debe ser usado dentro de un AppProvider');
  }
  return context;
};