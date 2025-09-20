// Contenido para: src/components/tabs/Invoicing.tsx
import { useState, useMemo } from 'react';
import { Download, FileText } from 'lucide-react'; // <-- 1. IMPORTAR FileText
import { styles } from '../../styles';
import type { Invoice, Config, Student } from '../../types'; // <-- 2. IMPORTAR Student

// --- 3. ACTUALIZAR LAS PROPS ---
interface InvoicingProps {
    invoices: Invoice[];
    onUpdateStatus: (invoiceId: string, newStatus: Invoice['status']) => void;
    config: Config;
    onExport: () => void;
    students: Student[]; // <-- AÑADIDO
    onGeneratePastInvoice: (student: Student, invoice: Invoice) => void; // <-- AÑADIDO
}

// Lógica de fecha para filtrar
const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

// --- 4. ACEPTAR LAS NUEVAS PROPS ---
const Invoicing = ({ invoices, onUpdateStatus, config, onExport, students, onGeneratePastInvoice }: InvoicingProps) => {
    const [activeSubTab, setActiveSubTab] = useState<'actual' | 'pasadas'>('actual');
    const [searchTerm, setSearchTerm] = useState('');

    const handleStatusChange = (invoiceId: string, newStatus: Invoice['status']) => { onUpdateStatus(invoiceId, newStatus); };

    // ... (la lógica de useMemo para 'currentMonthInvoices' y 'pastInvoices' sigue igual) ...
    const { currentMonthInvoices, pastInvoices } = useMemo(() => {
        const current: Invoice[] = [];
        const past: Invoice[] = [];
        
        const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        const lowerSearchTerm = searchTerm.toLowerCase();

        for (const inv of invoices) {
            const invDate = new Date(inv.date);
            if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
                current.push(inv);
            } 
            else if (invDate < firstDayOfCurrentMonth) {
                if (inv.childName.toLowerCase().includes(lowerSearchTerm)) {
                    past.push(inv);
                }
            }
        }
        current.sort((a, b) => a.childName.localeCompare(b.childName));
        past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

        return { currentMonthInvoices: current, pastInvoices: past };
    }, [invoices, searchTerm]);


    // --- 5. FUNCIÓN HANDLER PARA EL BOTÓN ---
    const handlePastInvoiceExport = (invoice: Invoice) => {
        // Encontrar al alumno correspondiente a esa factura
        const student = students.find(s => s.numericId === invoice.childId);
        if (student) {
            // Llamar a la función de App.tsx
            onGeneratePastInvoice(student, invoice);
        } else {
            alert("Error: No se encontraron los datos del alumno para esta factura.");
        }
    };
    
    const listToRender = activeSubTab === 'actual' ? currentMonthInvoices : pastInvoices;
    const listCount = listToRender.length;

    return (
        <div style={styles.card}>
            {/* ... (El header con el buscador y las pestañas sigue igual) ... */}
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
                    <div style={{flex: 1}}></div> 
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
                    Facturas de este mes ({currentMonthInvoices.length})
                </button>
                <button 
                    style={{...styles.subTabButton, ...(activeSubTab === 'pasadas' ? styles.subTabButtonActive : {})}}
                    onClick={() => setActiveSubTab('pasadas')}
                >
                    Facturas pasadas ({pastInvoices.length})
                </button>
            </div>

            {/* --- 6. AÑADIR BOTÓN EN EL RENDER --- */}
            <div style={styles.listContainer}>
                {listToRender.length > 0 ? listToRender.map(inv => (
                    <div key={inv.id} style={styles.listItem}>
                        <div>
                            <p style={styles.listItemName}>{inv.childName}</p>
                            <p style={styles.listItemInfo}>
                                Fecha: {new Date(inv.date).toLocaleDateString('es-ES')} | Base: {inv.base}{config.currency} + Penaliz: {inv.penalties}{config.currency}
                            </p>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <strong style={{fontSize: '16px'}}>{inv.amount.toFixed(2)}{config.currency}</strong>
                            
                            {/* --- BOTÓN DE EXPORTAR PDF (SOLO EN "PASADAS") --- */}
                            {activeSubTab === 'pasadas' && (
                                <button 
                                    onClick={() => handlePastInvoiceExport(inv)} 
                                    style={{...styles.actionButton, backgroundColor: '#17a2b8', padding: '5px 10px'}} // color cian
                                    title="Exportar PDF de esta factura"
                                >
                                    <FileText size={14} />
                                </button>
                            )}
                            {/* --- FIN DEL BOTÓN --- */}

                            <select 
                                value={inv.status} 
                                onChange={(e) => handleStatusChange(inv.id, e.target.value as Invoice['status'])} 
                                style={styles.formInputSmall}
                            >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Pagada">Pagada</option>
                                <option value="Vencida">Vencida</option>
                            </select>
                        </div>
                    </div>
                )) : <p>No hay facturas en esta vista.</p>}
            </div>
        </div>
    );
};

export default Invoicing;