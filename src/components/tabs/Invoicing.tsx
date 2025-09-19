// Contenido para: src/components/tabs/Invoicing.tsx
import { useState, useMemo } from 'react'; // AÑADIDOS
import { Download } from 'lucide-react';
import { styles } from '../../styles';
import type { Invoice, Config } from '../../types';

interface InvoicingProps {
    invoices: Invoice[];
    onUpdateStatus: (invoiceId: string, newStatus: Invoice['status']) => void;
    config: Config;
    onExport: () => void;
}

// Lógica de fecha para filtrar
const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

const Invoicing = ({ invoices, onUpdateStatus, config, onExport }: InvoicingProps) => {
    // Estado para la sub-pestaña activa
    const [activeSubTab, setActiveSubTab] = useState<'actual' | 'pasadas'>('actual');

    const handleStatusChange = (invoiceId: string, newStatus: Invoice['status']) => { onUpdateStatus(invoiceId, newStatus); };

    // --- Listas Memoizadas ---
    const { currentMonthInvoices, pastInvoices } = useMemo(() => {
        const current: Invoice[] = [];
        const past: Invoice[] = [];
        
        const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);

        for (const inv of invoices) {
            const invDate = new Date(inv.date);
            // Comprueba si la factura es del mes y año actuales
            if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
                current.push(inv);
            } 
            // Comprueba si la factura es anterior al primer día de este mes
            else if (invDate < firstDayOfCurrentMonth) {
                past.push(inv);
            }
            // (Las facturas futuras, si las hubiera, no se muestran en ninguna)
        }

        // Ordenar las actuales por nombre
        current.sort((a, b) => a.childName.localeCompare(b.childName));
        // Ordenar las pasadas por fecha (la más nueva primero)
        past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

        return { currentMonthInvoices: current, pastInvoices: past };
    }, [invoices]); // Se recalcula solo si la lista de facturas cambia
    // --- Fin Listas Memoizadas ---

    // Determina qué lista mostrar
    const listToRender = activeSubTab === 'actual' ? currentMonthInvoices : pastInvoices;
    const listCount = listToRender.length;

    return (
        <div style={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{...styles.cardTitle, marginBottom: 0}}>
                    Facturación ({listCount})
                </h3>
                <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar Todo</button>
            </div>

            {/* --- CONTENEDOR DE SUB-PESTAÑAS --- */}
            <div style={styles.subTabContainer}>
                <button 
                    style={{...styles.subTabButton, ...(activeSubTab === 'actual' ? styles.subTabButtonActive : {})}}
                    onClick={() => setActiveSubTab('actual')}
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
            {/* --- FIN SUB-PESTAÑAS --- */}

            <div style={styles.listContainer}>
                {listToRender.length > 0 ? listToRender.map(inv => (
                    <div key={inv.id} style={styles.listItem}>
                        <div>
                            <p style={styles.listItemName}>{inv.childName}</p>
                            {/* Usamos toLocaleDateString para formatear mejor la fecha */}
                            <p style={styles.listItemInfo}>
                                Fecha: {new Date(inv.date).toLocaleDateString('es-ES')} | Base: {inv.base}{config.currency} + Penaliz: {inv.penalties}{config.currency}
                            </p>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <strong style={{fontSize: '16px'}}>{inv.amount.toFixed(2)}{config.currency}</strong>
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