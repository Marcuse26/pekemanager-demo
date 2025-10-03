// Contenido para: src/components/tabs/Invoicing.tsx
import { useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { styles } from '../../styles';
import { useAppContext } from '../../context/AppContext';
import type { Invoice, Student } from '../../types';

interface InvoicingProps {
    onGenerateCurrentInvoice: (student: Student) => void;
    onGenerateNextMonthInvoice: (student: Student) => void;
    onGeneratePastMonthsInvoice: (student: Student) => void;
    addNotification: (message: string) => void;
}

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

const Invoicing = ({ onGenerateCurrentInvoice, onGenerateNextMonthInvoice, onGeneratePastMonthsInvoice, addNotification }: InvoicingProps) => {
    const { students, schedules, config } = useAppContext();
    const [activeSubTab, setActiveSubTab] = useState<'actual' | 'pasadas' | 'otros'>('actual');
    const [searchTerm, setSearchTerm] = useState('');

    const { activeStudents, pastStudents, otherStudents } = useMemo(() => {
        const active: Student[] = []; 
        const past: Student[] = []; 
        const other: Student[] = [];
        
        const firstDayThisMonth = new Date(currentYear, currentMonth, 1);
        const lastDayThisMonth = new Date(currentYear, currentMonth + 1, 0);

        const isStudentActiveThisMonth = (student: Student): boolean => {
            if (!student.startMonth) return false;
            const startDate = new Date(student.startMonth);
            const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;
            return startDate <= lastDayThisMonth && (!endDate || endDate >= firstDayThisMonth);
        }

        const isStudentInactivePast = (student: Student): boolean => {
            if (!student.plannedEndMonth) return false;
            const endDate = new Date(student.plannedEndMonth);
            return endDate < firstDayThisMonth;
        }
        
        for (const student of students) {
            if (isStudentActiveThisMonth(student)) {
                active.push(student);
            } else if (isStudentInactivePast(student)) {
                past.push(student);
            } else {
                other.push(student);
            }
        }

        active.sort((a, b) => a.name.localeCompare(b.name));
        past.sort((a,b) => (b.plannedEndMonth || '').localeCompare(a.plannedEndMonth || ''));
        other.sort((a,b) => (a.startMonth || '').localeCompare(b.startMonth || ''));
        
        return { activeStudents: active, pastStudents: past, otherStudents: other };
    }, [students]);

    const handleInvoiceGeneration = (student: Student) => {
        if (!student) { addNotification("Error: No se encontraron los datos del alumno."); return; }

        switch (activeSubTab) {
            case 'actual':
                onGenerateCurrentInvoice(student);
                break;
            case 'pasadas':
                onGeneratePastMonthsInvoice(student);
                break;
            case 'otros':
                const today = new Date();
                const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                if (student.startMonth && new Date(student.startMonth).getMonth() === firstDayNextMonth.getMonth() && new Date(student.startMonth).getFullYear() === firstDayNextMonth.getFullYear()) {
                    onGenerateNextMonthInvoice(student);
                } else {
                    addNotification(`Solo se puede generar la factura del mes siguiente para alumnos que se incorporan el próximo mes.`);
                }
                break;
        }
    };
    
    const getButtonStyle = () => {
        switch (activeSubTab) {
            case 'actual': return { backgroundColor: '#17a2b8', title: 'Generar Factura Mes Actual' };
            case 'pasadas': return { backgroundColor: '#ffc107', title: 'Generar Factura Meses Pasados' };
            case 'otros': return { backgroundColor: '#28a745', title: 'Generar Factura Mes Siguiente' };
            default: return {};
        }
    };

    const lowerSearchTerm = searchTerm.toLowerCase();
    let listToRender: Student[] = [];
    let placeholderText = "Buscar por nombre de alumno...";

    switch (activeSubTab) {
        case 'actual': listToRender = activeStudents.filter(s => `${s.name} ${s.surname}`.toLowerCase().includes(lowerSearchTerm)); placeholderText = "Buscar en alumnos activos..."; break;
        case 'pasadas': listToRender = pastStudents.filter(s => `${s.name} ${s.surname}`.toLowerCase().includes(lowerSearchTerm)); placeholderText = "Buscar en inactivos (anteriores)..."; break;
        case 'otros': listToRender = otherStudents.filter(s => `${s.name} ${s.surname}`.toLowerCase().includes(lowerSearchTerm)); placeholderText = "Buscar en inactivos (posteriores)..."; break;
    }
    const listCount = listToRender.length;

    return (
        <div style={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{...styles.cardTitle, marginBottom: 0, flexShrink: 0}}>Gestión de Facturas ({listCount})</h3>
                <input type="text" placeholder={placeholderText} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{...styles.formInputSmall, width: '350px', margin: '0 20px'}} />
            </div>
            <div style={styles.subTabContainer}>
                <button style={{...styles.subTabButton, ...(activeSubTab === 'actual' ? styles.subTabButtonActive : {})}} onClick={() => { setActiveSubTab('actual'); setSearchTerm(''); }}> Activos ({activeStudents.length}) </button>
                <button style={{...styles.subTabButton, ...(activeSubTab === 'pasadas' ? styles.subTabButtonActive : {})}} onClick={() => { setActiveSubTab('pasadas'); setSearchTerm(''); }}> Inactivos (meses anteriores) ({pastStudents.length}) </button>
                <button style={{...styles.subTabButton, ...(activeSubTab === 'otros' ? styles.subTabButtonActive : {})}} onClick={() => { setActiveSubTab('otros'); setSearchTerm(''); }}> Inactivos (posteriores) ({otherStudents.length}) </button>
            </div>
            <div style={styles.listContainer}>
                {listToRender.length > 0 ? listToRender.map(student => {
                    const schedule = schedules.find(s => s.id === student.schedule);
                    const fee = schedule ? schedule.price : 0;
                    const extendedFee = student.extendedSchedule ? 30 : 0;
                    const totalFee = fee + extendedFee;

                    return (
                        <div key={student.id} style={styles.listItem}>
                            <div>
                                <p style={styles.listItemName}>{student.name} {student.surname}</p>
                                <p style={styles.listItemInfo}>
                                    Cuota Mensual: {totalFee.toFixed(2)}{config.currency}
                                </p>
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                               <span style={{...styles.pillInfo, width: '120px', justifyContent: 'center'}}>
                                    {totalFee.toFixed(2)}{config.currency}
                                </span>
                                <button onClick={() => handleInvoiceGeneration(student)} style={{...styles.actionButton, ...getButtonStyle(), padding: '5px 10px'}} title={getButtonStyle().title}> <FileText size={14} /> </button>
                            </div>
                        </div>
                    );
                }) : <p>No hay alumnos que coincidan con los filtros.</p>}
            </div>
        </div>
    );
};
export default Invoicing;