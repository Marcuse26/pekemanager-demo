import { useState, useMemo } from 'react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { styles } from '../../styles';
import { useAppContext } from '../../context/AppContext'; // [!code ++]
import type { Invoice, Student } from '../../types';

interface InvoicingProps {
    onUpdateStatus: (invoiceId: string, newStatus: Invoice['status']) => void;
    onExport: () => void;
    onGeneratePastInvoice: (student: Student, invoice: Invoice) => void;
    onDeleteInvoice: (invoice: Invoice) => void;
    onGeneratePastMonthsInvoice: (student: Student) => void;
}

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

const Invoicing = ({ onUpdateStatus, onExport, onGeneratePastInvoice, onDeleteInvoice }: InvoicingProps) => {
    const { invoices, students, config } = useAppContext(); // [!code ++]
    const [activeSubTab, setActiveSubTab] = useState<'actual' | 'pasadas' | 'otros'>('actual');
    const [searchTerm, setSearchTerm] = useState('');

    const handleStatusChange = (invoiceId: string, newStatus: Invoice['status']) => { onUpdateStatus(invoiceId, newStatus); };

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

        for (const inv of invoices) {
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

    const handlePastInvoiceExport = (invoice: Invoice) => {
        const student = students.find(s => s.numericId === invoice.childId);
        if (student) { onGeneratePastInvoice(student, invoice); } 
        else { alert("Error: No se encontraron los datos del alumno para esta factura."); }
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
                <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8', flexShrink: 0}}> <Download size={16} style={{marginRight: '8px'}} />Exportar Facturación </button>
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
                            <button onClick={() => handlePastInvoiceExport(inv)} style={{...styles.actionButton, backgroundColor: '#17a2b8', padding: '5px 10px'}} title="Exportar PDF de esta factura"> <FileText size={14} /> </button>
                            <select value={inv.status} onChange={(e) => handleStatusChange(inv.id, e.target.value as Invoice['status'])} style={styles.formInputSmall}>
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