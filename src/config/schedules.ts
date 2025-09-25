// Contenido para: src/config/schedules.ts
import type { Schedule } from '../types';

export const schedules: Schedule[] = [
    { id: 'h_315', name: 'Cuota 315€ (8:30-12:30)', price: 315, endTime: '12:30' },
    { id: 'h_410', name: 'Cuota 410€ (8:30-13:30)', price: 410, endTime: '13:30' },
    { id: 'h_425', name: 'Cuota 425€ (8:30-15:00)', price: 425, endTime: '15:00' },
    { id: 'h_450', name: 'Cuota 450€ (8:30-15:30)', price: 450, endTime: '15:30' },
    { id: 'h_460', name: 'Cuota 460€ (8:30-16:30)', price: 460, endTime: '16:30' },
    { id: 'h_495', name: 'Cuota 495€ (8:30-17:00)', price: 495, endTime: '17:00' },
    { id: 'h_545', name: 'Cuota 545€ (8:30-18:00)', price: 545, endTime: '18:00' },
];