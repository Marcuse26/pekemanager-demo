import { useState } from 'react';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { styles } from '../../styles';
import { useAppContext } from '../../context/AppContext'; // [!code ++]

const CalendarView = () => {
    const { attendance } = useAppContext(); // [!code ++]
    const [currentDate, setCurrentDate] = useState(new Date());
    const changeMonth = (amount: number) => { setCurrentDate(prevDate => { const newDate = new Date(prevDate); newDate.setMonth(newDate.getMonth() + amount); return newDate; }); };

    const dailyCounts = attendance.reduce((acc, att) => {
        if (!acc[att.date]) { acc[att.date] = new Set(); }
        acc[att.date].add(att.childId);
        return acc;
    }, {} as Record<string, Set<number>>);

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
            const count = dailyCounts[dateStr] ? dailyCounts[dateStr].size : 0;
            cells.push(
                <div key={day} style={{...styles.dayCell, ...(count > 20 ? {backgroundColor: '#d4edda'} : count > 10 ? {backgroundColor: '#fff3cd'} : {})}}>
                    <span style={styles.dayNumber}>{day}</span>
                    {count > 0 && (<div style={styles.dayCount}><Users size={14} style={{marginRight: '4px'}} />{count}</div>)}
                </div>
            );
        }
        return cells;
    };

    return (
        <div style={styles.card}>
            <div style={styles.calendarHeader}>
                <button onClick={() => changeMonth(-1)} style={styles.calendarNavButton}><ChevronLeft /></button>
                <h2 style={styles.cardTitle}>{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</h2>
                <button onClick={() => changeMonth(1)} style={styles.calendarNavButton}><ChevronRight /></button>
            </div>
            <div style={styles.calendarGrid}>
                {weekDays.map(day => <div key={day} style={styles.weekDay}>{day}</div>)}
                {renderCells()}
            </div>
        </div>
    );
};

export default CalendarView;