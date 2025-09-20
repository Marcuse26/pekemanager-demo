// Contenido para: src/components/tabs/Invoicing.tsx
import { useState, useMemo } from 'react';
import { Download, FileText, Trash2 } from 'lucide-react'; // <-- AÑADIDO Trash2
import { styles } from '../../styles';
import type { Invoice, Config, Student } from '../../types';

interface InvoicingProps {
    invoices: Invoice[];
    onUpdateStatus: (invoiceId: string, newStatus: Invoice['status']) => void;
    config: Config;
    onExport: () => void;
    students: Student[];
    onGeneratePastInvoice: (student: Student, invoice: Invoice) => void;
    onDeleteInvoice: (invoice: Invoice) => void; // <-- AÑADIDA PROP
}

// Lógica de fecha para filtrar (constantes globales)
const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

const Invoicing = ({ 
    invoices, 
    onUpdateStatus, 
    config, 
    onExport, 
    students, 
    onGeneratePastInvoice, 
    onDeleteInvoice // <-- AÑADIDA PROP
}: InvoicingProps) => {
    
    const [activeSubTab, setActiveSubTab] = useState<'actual' | 'pasadas'>('actual');
    const [searchTerm, setSearchTerm] = useState('');

    const handleStatusChange = (invoiceId: string, newStatus: Invoice['status']) => { onUpdateStatus(invoiceId, newStatus); };

    // --- INICIO DE LA MODIFICACIÓN ---
    // El hook useMemo ahora filtra las facturas según el estado (activo/inactivo)
    // del alumno al que pertenecen.
    const { currentMonthInvoices, pastInvoices } = useMemo(() => {
        const current: Invoice[] = [];
        const past: Invoice[] = [];
        
        // --- Definiciones de Fecha ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Usamos las consts 'currentMonth' y 'currentYear' definidas fuera del componente
        const firstDayThisMonth = new Date(currentYear, currentMonth, 1);
        const lastDayThisMonth = new Date(currentYear, currentMonth + 1, 0);
        const lowerSearchTerm = searchTerm.toLowerCase();

        // --- Helpers de Estado de Alumno ---
        const isStudentActiveThisMonth = (student: Student): boolean => {
            if (!student.startMonth) return false;
            const startDate = new Date(student.startMonth);
            const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;
            const startsBeforeOrDuringMonth = startDate <= lastDayThisMonth;
            const endsAfterOrDuringMonth = !endDate || endDate >= firstDayThisMonth;
            return startsBeforeOrDuringMonth && endsAfterOrDuringMonth;
        }

        const isStudentInactive = (student: Student): boolean => {
            if (!student.plannedEndMonth) return false;
            const endDate = new Date(student.plannedEndMonth);
            return endDate < firstDayThisMonth; // Baja es anterior a este mes
        }
        // --- Fin Helpers ---

        for (const inv of invoices) {
            const student = students.find(s => s.numericId === inv.childId);

            if (!student) {
                // Factura huérfana (sin alumno), va a pasadas por defecto
                if (inv.childName.toLowerCase().includes(lowerSearchTerm)) {
                    past.push(inv);
                }
                continue;
            }

            // ASOCIACIÓN BASADA EN ESTADO DEL ALUMNO
            
            // 1. Alumnos activos este mes -> Pestaña "Actual"
            // (La petición 1 del usuario)
            if (isStudentActiveThisMonth(student)) {
                current.push(inv);
            } 
            // 2. Alumnos con baja anterior a este mes -> Pestaña "Pasadas"
            // (La petición 2 del usuario)
            else if (isStudentInactive(student)) {
                if (inv.childName.toLowerCase().includes(lowerSearchTerm)) {
                    past.push(inv);
                }
            } 
            // 3. Alumnos en "limbo" (baja este mes, o alta futura) -> Pestaña "Pasadas"
            else {
                 if (inv.childName.toLowerCase().includes(lowerSearchTerm)) {
                    past.push(inv);
                }
            }
        }
        
        // Ordenar: "actual" por nombre, "pasadas" por fecha de factura
        current.sort((a, b) => a.childName.localeCompare(b.childName));
        past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

        return { currentMonthInvoices: current, pastInvoices: past };
    }, [invoices, searchTerm, students]); // <-- Dependencias actualizadas
    // --- FIN DE LA MODIFICACIÓN ---


    const handlePastInvoiceExport = (invoice: Invoice) => {
        const student = students.find(s => s.numericId === invoice.childId);
        if (student) {
            onGeneratePastInvoice(student, invoice);
        } else {
            alert("Error: No se encontraron los datos del alumno para esta factura.");
        }
    };
    
    const listToRender = activeSubTab === 'actual' ? currentMonthInvoices : pastInvoices;
    const listCount = listToRender.length;

    return (
        <div style={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{...styles.cardTitle, marginBottom: 0, flexShrink: 0}}>
                    Facturación ({listCount})
                </h3>
                
                {activeSubTab === 'pasadas' ? (
                    <input
                        type="text"
                        placeholder="Buscar por nombre en facturas pasadas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{...styles.formInputSmall, width: '350px', margin: '0 20px'}}
                    />
                ) : (
                    // Filtro de búsqueda para la pestaña "Actual" (alumnos activos)
                     <input
                        type="text"
                        placeholder="Buscar por nombre en facturas actuales..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{...styles.formInputSmall, width: '350px', margin: '0 20px'}}
                    />
                )}

                <button 
                    onClick={onExport} 
                    style={{...styles.actionButton, backgroundColor: '#17a2b8', flexShrink: 0}}
                >
                    <Download size={16} style={{marginRight: '8px'}} />Exportar Todo
                </button>
            </div>

            <div style={styles.subTabContainer}>
                <button 
                    style={{...styles.subTabButton, ...(activeSubTab === 'actual' ? styles.subTabButtonActive : {})}}
                    onClick={() => { setActiveSubTab('actual'); setSearchTerm(''); }}
                >
                    Facturas (Alumnos Activos) ({currentMonthInvoices.length})
                </button>
                <button 
                    style={{...styles.subTabButton, ...(activeSubTab === 'pasadas' ? styles.subTabButtonActive : {})}}
                    onClick={() => setActiveSubTab('pasadas')}
                >
                    Facturas (Alumnos Inactivos) ({pastInvoices.length})
                </button>
            </div>

            <div style={styles.listContainer}>
                {listToRender.length > 0 ? listToRender.map(inv => (
                    <div key={inv.id} style={styles.listItem}>
                        <div>
                            <p style={styles.listItemName}>{inv.childName}</p>
                            <p style={styles.listItemInfo}>
                                Fecha Factura: {new Date(inv.date).toLocaleDateString('es-ES')} | Base: {inv.base}{config.currency} + Penaliz: {inv.penalties}{config.currency}
                            </p>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <strong style={{fontSize: '16px'}}>{inv.amount.toFixed(2)}{config.currency}</strong>
                            
                            {/* Permitir exportar PDF desde ambas pestañas */}
                            <button 
                                onClick={() => handlePastInvoiceExport(inv)} 
                                style={{...styles.actionButton, backgroundColor: '#17a2b8', padding: '5px 10px'}}
                                title="Exportar PDF de esta factura"
                            >
                                <FileText size={14} />
                            </button>

                            <select 
                                value={inv.status} 
                                onChange={(e) => handleStatusChange(inv.id, e.target.value as Invoice['status'])} 
                                style={styles.formInputSmall}
                            >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Pagada">Pagada</option>
                                <option value="Vencida">Vencida</option>
                            </select>
                            
                            {/* --- BOTÓN DE BORRAR AÑADIDO --- */}
                            <button 
                                onClick={() => onDeleteInvoice(inv)} 
                                style={styles.deleteButton} 
                                title="Eliminar factura"
                            >
                                <Trash2 size={14} />
                            </button>
                            {/* --- FIN BOTÓN DE BORRAR --- */}

                        </div>
                    </div>
                )) : <p>No hay facturas en esta vista.</p>}
            </div>
        </div>
    );
};

export default Invoicing;