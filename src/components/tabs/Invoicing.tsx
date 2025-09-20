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

// Lógica de fecha para filtrar
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
                            
                            {activeSubTab === 'pasadas' && (
                                <button 
                                    onClick={() => handlePastInvoiceExport(inv)} 
                                    style={{...styles.actionButton, backgroundColor: '#17a2b8', padding: '5px 10px'}}
                                    title="Exportar PDF de esta factura"
                                >
                                    <FileText size={14} />
                                </button>
                            )}

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