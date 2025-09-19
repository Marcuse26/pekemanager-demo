// Contenido para: src/components/tabs/Invoicing.tsx
import { useState, useMemo } from 'react';
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
    // --- NUEVO ESTADO PARA EL BUSCADOR ---
    const [searchTerm, setSearchTerm] = useState('');

    const handleStatusChange = (invoiceId: string, newStatus: Invoice['status']) => { onUpdateStatus(invoiceId, newStatus); };

    // --- Listas Memoizadas (separadas para optimizar el buscador) ---

    // 1. Facturas del mes actual (SIN buscador)
    const currentMonthInvoices = useMemo(() => {
        const current: Invoice[] = [];
        for (const inv of invoices) {
            const invDate = new Date(inv.date);
            if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
                current.push(inv);
            }
        }
        // Ordenar las actuales por nombre
        return current.sort((a, b) => a.childName.localeCompare(b.childName));
    }, [invoices]); // No depende de searchTerm

    // 2. Facturas pasadas (CON buscador)
    const pastInvoices = useMemo(() => {
        const past: Invoice[] = [];
        const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        const lowerSearchTerm = searchTerm.toLowerCase();

        for (const inv of invoices) {
            const invDate = new Date(inv.date);
            // Si la factura es anterior a este mes
            if (invDate < firstDayOfCurrentMonth) {
                // Aplicar filtro de búsqueda por nombre
                if (inv.childName.toLowerCase().includes(lowerSearchTerm)) {
                    past.push(inv);
                }
            }
        }
        // Ordenar las pasadas por fecha (la más nueva primero)
        return past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
    }, [invoices, searchTerm]); // Ahora depende de searchTerm
    // --- Fin Listas Memoizadas ---

    // Determina qué lista mostrar
    const listToRender = activeSubTab === 'actual' ? currentMonthInvoices : pastInvoices;
    const listCount = listToRender.length;

    return (
        <div style={styles.card}>
            {/* --- HEADER MODIFICADO CON BUSCADOR --- */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{...styles.cardTitle, marginBottom: 0, flexShrink: 0}}>
                    Facturación ({listCount})
                </h3>
                
                {/* El buscador solo aparece si la pestaña "pasadas" está activa */}
                {activeSubTab === 'pasadas' ? (
                    <input
                        type="text"
                        placeholder="Buscar por nombre en facturas pasadas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{...styles.formInputSmall, width: '350px', margin: '0 20px'}}
                    />
                ) : (
                    // Espaciador para mantener el botón de exportar a la derecha
                    <div style={{flex: 1}}></div> 
                )}

                <button 
                    onClick={onExport} 
                    style={{...styles.actionButton, backgroundColor: '#17a2b8', flexShrink: 0}}
                >
                    <Download size={16} style={{marginRight: '8px'}} />Exportar Todo
                </button>
            </div>
            {/* --- FIN HEADER --- */}


            {/* --- CONTENEDOR DE SUB-PESTAÑAS --- */}
            <div style={styles.subTabContainer}>
                <button 
                    style={{...styles.subTabButton, ...(activeSubTab === 'actual' ? styles.subTabButtonActive : {})}}
                    // Al volver a "actual", limpiamos el buscador
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
            {/* --- FIN SUB-PESTAÑAS --- */}

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