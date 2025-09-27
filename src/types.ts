// Contenido para: src/types.ts

// Asegúrate de exportar cada tipo
export type Schedule = { id: string; name: string; price: number; endTime: string; };
export type Document = { id: string; name: string; data: string; };
export type HistoryLog = { id: string; user: string; timestamp: string; changes: string; };
export type AppHistoryLog = { id: string; user: string; timestamp: string; action: string; details: string; };

export interface Student {
  id: string; // Firestore ID
  numericId: number; // Legacy ID for relations
  name: string;
  surname: string;
  schedule: string;
  enrollmentPaid: boolean;
  monthlyPayment: boolean;
  birthDate: string;
  address: string;
  fatherName: string;
  motherName: string;
  phone1: string;
  phone2: string;
  parentEmail: string;
  allergies: string;
  authorizedPickup: string;
  paymentMethod: 'Cheque guardería' | 'Transferencia' | 'Domiciliación';
  accountHolderName: string;
  nif?: string; // NIF/DNI del titular
  documents: Document[];
  modificationHistory: HistoryLog[];
  startMonth?: string;
  plannedEndMonth?: string;
  extendedSchedule?: boolean; // Suplemento de horario ampliado
  nextMonthSchedule?: string; // --- CAMBIO AÑADIDO --- Horario para el próximo mes
}

export type Attendance = { id: string; childId: number; childName: string; date: string; entryTime?: string; exitTime?: string; droppedOffBy?: string; pickedUpBy?: string; };
export type Penalty = { id: string; childId: number; childName: string; date: string; amount: number; reason: string; };

export interface Invoice {
  id: string;
  numericId: number;
  childId: number;
  childName: string;
  date: string;
  amount: number;
  base: number;
  penalties: number;
  enrollmentFeeIncluded: boolean;
  status: 'Pendiente' | 'Pagada' | 'Vencida';
  extendedScheduleFee?: number; // Tarifa de horario ampliado aplicada
};


export type StaffTimeLog = {
  id: string;
  userName: string;
  date: string;
  checkIn: string;
  checkOut: string;
};

export type Config = { centerName: string; currency: string; lateFee: number; };
export type NotificationMessage = { id: number; message: string; };

// Formulario de Estudiante (Omitimos campos generados automáticamente)
export type StudentFormData = Omit<Student, 'id' | 'numericId'|'paymentMethod' | 'documents' | 'modificationHistory'> & { paymentMethod: Student['paymentMethod'] | ''; accountHolderName: string; };