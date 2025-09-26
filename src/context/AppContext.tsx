// Contenido para: src/context/AppContext.tsx
import React, { createContext, useContext, useState } from 'react';
import type { Student, Invoice, Attendance, Penalty, Config, Schedule, StaffTimeLog, AppHistoryLog } from '../types';

// 1. Definimos la forma que tendrá nuestro contexto
interface AppContextType {
  students: Student[];
  invoices: Invoice[];
  attendance: Attendance[];
  penalties: Penalty[];
  config: Config;
  schedules: Schedule[];
  staffTimeLogs: StaffTimeLog[];
  appHistory: AppHistoryLog[];
  // Podríamos añadir aquí las funciones para modificar el estado
  // por ejemplo: addStudent: (student: Student) => void;
}

// 2. Creamos el Context con un valor inicial por defecto
const AppContext = createContext<AppContextType | undefined>(undefined);

// 3. Creamos el componente "Proveedor" que envolverá nuestra aplicación
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Aquí moveríamos todos los useState que ahora están en App.tsx
  // Por simplicidad, empezamos con datos de ejemplo o vacíos
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [config, setConfig] = useState<Config>({ centerName: 'mi pequeño recreo', currency: '€', lateFee: 6 });
  const [schedules] = useState<Schedule[]>([]); // Suponiendo que no cambian
  const [staffTimeLogs, setStaffTimeLogs] = useState<StaffTimeLog[]>([]);
  const [appHistory, setAppHistory] = useState<AppHistoryLog[]>([]);
  
  // Aquí también irían los useEffect para cargar los datos desde Firebase
  // y las funciones para añadir/modificar/borrar datos.

  const value = {
    students,
    invoices,
    attendance,
    penalties,
    config,
    schedules,
    staffTimeLogs,
    appHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// 4. Creamos un hook personalizado para consumir el contexto fácilmente
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};