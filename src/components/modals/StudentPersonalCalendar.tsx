// Contenido para: src/components/modals/StudentPersonalCalendar.tsx
import { useState, useRef } from 'react';
import { DollarSign, Printer, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { styles } from '../../styles';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { useAppContext } from '../../context/AppContext';
import type { Student } from '../../types';

const StudentPersonalCalendar = ({ student, onClose }: { student: Student; onClose: () => void; }) => {
    const { attendance, penalties } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(modalRef, onClose);

    const changeMonth = (amount: number) => { setCurrentDate(prevDate => { const newDate = new Date(prevDate); newDate.setMonth(newDate.getMonth() + amount); return newDate; }); };

    const handleExport = () => {
        const calendarNode = calendarRef.current;
        if (calendarNode) {
            const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            const printWindow = window.open('', '_blank');
            printWindow?.document.write(`
                <html>
                    <head>
                        <title>Calendario de ${student.name} ${student.surname} - ${monthName}</title>
                        <style>
                            body { font-family: system-ui, sans-serif; }
                            h1, h2 { text-align: center; }
                            .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; border: 1px solid #ccc; padding: 5px; }
                            .week-day { font-weight: bold; text-align: center; padding: 5px; background-color: #f2f2f2; }
                            .day-cell { border: 1px solid #eee; min-height: 80px; padding: 5px; font-size: 12px; }
                            .day-number { font-weight: bold; }
                            .event-pill { background-color: #e9f3ff; color: #004085; border-radius: 4px; padding: 3px; margin-top: 5px; text-align: center; }
                            .penalty-pill { background-color: #fff3cd; color: #856404; border-radius: 4px; padding: 3px; margin-top: 5px; text-align: center; }
                            .day-cell-empty { border: 1px solid transparent; }
                        </style>
                    </head>
                    <body>
                        <h1>mi pequeño recreo</h1>
                        <h2>Calendario de Asistencia: ${student.name} ${student.surname}</h2>
                        <h3>${monthName.toUpperCase()}</h3>
                        <div class="calendar-grid">${calendarNode.innerHTML}</div>
                    </body>
                </html>
            `);
            printWindow?.document.close();
            printWindow?.print();
        }
    };

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const renderCells = () => {
        const cells = [];
        const adjustedFirstDay = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;
        for (let i = 0; i < adjustedFirstDay; i++) { cells.push(<div key={`empty-${i}`} style={styles.dayCellEmpty}></div>); }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const attendanceRecord = attendance.find(a => a.childId === student.numericId && a.date === dateStr);
            const penaltyRecord = penalties.find(p => p.childId === student.numericId && p.date === dateStr);
            
            cells.push(
                <div key={day} style={styles.dayCell}>
                    <div style={styles.dayNumber}>{day}</div>
                    {attendanceRecord && (
                        <div style={styles.eventPill}>
                            {attendanceRecord.entryTime} - {attendanceRecord.exitTime}
                        </div>
                    )}
                    {penaltyRecord && (
                         <div style={styles.penaltyPill} title={`Motivo: ${penaltyRecord.reason}`}>
                            <DollarSign size={11} style={{marginRight: '4px'}}/> {penaltyRecord.amount}€
                        </div>
                    )}
                </div>
            );
        }
        return cells;
    };

    return (
      <div style={styles.modalBackdrop}>
          <div style={{...styles.modalContent, maxWidth: '900px'}} ref={modalRef}>
              <div style={{...styles.calendarHeader, position: 'relative'}}>
                  <h2 style={styles.cardTitle}>Calendario de ${student.name} ${student.surname}</h2>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <button onClick={() => changeMonth(-1)} style={styles.calendarNavButton}><ChevronLeft /></button>
                      <h3 style={{margin: 0, minWidth: '180px', textAlign: 'center'}}>{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                      <button onClick={() => changeMonth(1)} style={styles.calendarNavButton}><ChevronRight /></button>
                  </div>
                  <button onClick={handleExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Printer size={16} style={{marginRight: '8px'}} /> Exportar</button>
                  <button onClick={onClose} style={{...styles.modalCloseButton, right: '-15px'}}><X size={20} /></button>
              </div>
              <div style={styles.calendarGrid} ref={calendarRef}>
                  {weekDays.map(day => <div key={day} style={styles.weekDay}>{day}</div>)}
                  {renderCells()}
              </div>
          </div>
      </div>
    );
};

export default StudentPersonalCalendar;