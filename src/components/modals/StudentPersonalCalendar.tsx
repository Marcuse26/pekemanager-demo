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
            printWindow?.document.write(`<html>...</html>`); // Contenido del HTML para imprimir
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
                    {attendanceRecord && (<div style={styles.eventPill}>{attendanceRecord.entryTime} - {attendanceRecord.exitTime}</div>)}
                    {penaltyRecord && (<div style={styles.penaltyPill} title={`Motivo: ${penaltyRecord.reason}`}><DollarSign size={11} style={{marginRight: '4px'}}/> {penaltyRecord.amount}€</div>)}
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