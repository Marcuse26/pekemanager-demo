// Contenido para: src/components/tabs/Invoicing.tsx
import { useState, useMemo } from 'react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { styles } from '../../styles';
import { useAppContext } from '../../context/AppContext';
import type { Invoice, Student } from '../../types';

interface InvoicingProps {
    onUpdateStatus: (invoiceId: string, newStatus: Invoice['status']) => void;
    onExport: () => void;
    onGenerateCurrentInvoice: (student: Student) => void;
    onGenerateNextMonthInvoice: (student: Student) => void;
    onGeneratePastMonthsInvoice: (student: Student) => void;
    onDeleteInvoice: (invoice: Invoice) => void;
    addNotification: (message: string) => void;
}

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

const Invoicing = ({ onUpdateStatus, onExport, onGenerateCurrentInvoice, onGenerateNextMonthInvoice, onGeneratePastMonthsInvoice, onDeleteInvoice, addNotification }: InvoicingProps) => {
    const { invoices, students, config } = useAppContext();
    const [activeSubTab, setActiveSubTab] = useState<'actual' | 'pasadas' | 'otros'>('actual');
    const [searchTerm, setSearchTerm] = useState('');

    const { activeInvoices, pastInvoices, otherInvoices } = useMemo(() => {
        const active: Invoice[] = []; const past: Invoice[] = []; const other: Invoice[] = [];
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
            return new Date(student.plannedEndMonth) < firstDayThisMonth;
        }

        const uniqueInvoices = Array.from(new Map(invoices.map(inv => [inv.childId, inv])).values());

        for (const inv of uniqueInvoices) {
            const student = students.find(s => s.numericId === inv.childId);
            if (!student) { past.push(inv); continue; }
            if (isStudentActiveThisMonth(student)) { active.push(inv); }
            else if (isStudentInactivePast(student)) { past.push(inv); }
            else { other.push(inv); }
        }

        active.sort((a, b) => a.childName.localeCompare(b.childName));
        past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        other.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { activeInvoices: active, pastInvoices: past, otherInvoices: other };
    }, [invoices, students]);

    const handleInvoiceGeneration = (invoice: Invoice) => {
        const student = students.find(s => s.numericId === invoice.childId);
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
                if (student.startMonth && new Date(student.startMonth).getMonth() === firstDayNextMonth.getMonth()) {
                    onGenerateNextMonthInvoice(student);
                } else {
                    addNotification(`Solo se puede generar la factura del mes siguiente para alumnos que se incorporan el próximo mes.`);
                }
                break;
        }
    };
    
    const getButtonStyle = () => {
        switch (activeSubTab) {
            case 'actual': return { backgroundColor: '#17a2b8' }; // Azul/Turquesa
            case 'pasadas': return { backgroundColor: '#ffc107' }; // Amarillo
            case 'otros': return { backgroundColor: '#28a745' }; // Verde
            default: return {};
        }
    };

    const lowerSearchTerm = searchTerm.toLowerCase();
    let listToRender: Invoice[] = [];
    let placeholderText = "Buscar por nombre de alumno...";

    switch (activeSubTab) {
        case 'actual': listToRender = activeInvoices.filter(inv => inv.childName.toLowerCase().includes(lowerSearchTerm)); placeholderText = "Buscar en alumnos activos..."; break;
        case 'pasadas': listToRender = pastInvoices.filter(inv => inv.childName.toLowerCase().includes(lowerSearchTerm)); placeholderText = "Buscar en inactivos (anteriores)..."; break;
        case 'otros': listToRender = otherInvoices.filter(inv => inv.childName.toLowerCase().includes(lowerSearchTerm)); placeholderText = "Buscar en inactivos (posteriores)..."; break;
    }
    const listCount = listToRender.length;

    return (
        <div style={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{...styles.cardTitle, marginBottom: 0, flexShrink: 0}}>Facturación ({listCount})</h3>
                <input type="text" placeholder={placeholderText} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{...styles.formInputSmall, width: '350px', margin: '0 20px'}} />
                <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#6c757d', flexShrink: 0}}> <Download size={16} style={{marginRight: '8px'}} />Exportar Listado</button>
            </div>
            <div style={styles.subTabContainer}>
                <button style={{...styles.subTabButton, ...(activeSubTab === 'actual' ? styles.subTabButtonActive : {})}} onClick={() => { setActiveSubTab('actual'); setSearchTerm(''); }}> Activos ({activeInvoices.length}) </button>
                <button style={{...styles.subTabButton, ...(activeSubTab === 'pasadas' ? styles.subTabButtonActive : {})}} onClick={() => { setActiveSubTab('pasadas'); setSearchTerm(''); }}> Inactivos (meses anteriores) ({pastInvoices.length}) </button>
                <button style={{...styles.subTabButton, ...(activeSubTab === 'otros' ? styles.subTabButtonActive : {})}} onClick={() => { setActiveSubTab('otros'); setSearchTerm(''); }}> Inactivos (meses posteriores) ({otherInvoices.length}) </button>
            </div>
            <div style={styles.listContainer}>
                {listToRender.length > 0 ? listToRender.map(inv => (
                    <div key={inv.id} style={styles.listItem}>
                        <div>
                            <p style={styles.listItemName}>{inv.childName}</p>
                            <p style={styles.listItemInfo}> Fecha Factura: {new Date(inv.date).toLocaleDateString('es-ES')} | Base: {inv.base}{config.currency} + Penaliz: {inv.penalties}{config.currency} </p>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <strong style={{fontSize: '16px'}}>{inv.amount.toFixed(2)}{config.currency}</strong>
                            <button onClick={() => handleInvoiceGeneration(inv)} style={{...styles.actionButton, ...getButtonStyle(), padding: '5px 10px'}} title="Generar nueva factura PDF"> <FileText size={14} /> </button>
                            <select value={inv.status} onChange={(e) => onUpdateStatus(inv.id, e.target.value as Invoice['status'])} style={styles.formInputSmall}>
                                <option value="Pendiente">Pendiente</option> <option value="Pagada">Pagada</option> <option value="Vencida">Vencida</option>
                            </select>
                            <button onClick={() => onDeleteInvoice(inv)} style={styles.deleteButton} title="Eliminar factura"> <Trash2 size={14} /> </button>
                        </div>
                    </div>
                )) : <p>No hay facturas que coincidan con los filtros.</p>}
            </div>
        </div>
    );
};
export default Invoicing;