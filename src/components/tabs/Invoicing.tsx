// Contenido para: src/components/tabs/Invoicing.tsx
import { Download } from 'lucide-react';
import { styles } from '../../styles';
import type { Invoice, Config } from '../../types';

interface InvoicingProps {
    invoices: Invoice[];
    onGenerate: () => void;
    onUpdateStatus: (invoiceId: string, newStatus: Invoice['status']) => void;
    config: Config;
    onExport: () => void;
}

const Invoicing = ({ invoices, onGenerate, onUpdateStatus, config, onExport }: InvoicingProps) => {
    const handleStatusChange = (invoiceId: string, newStatus: Invoice['status']) => { onUpdateStatus(invoiceId, newStatus); };
    return (
        <div style={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><h3 style={styles.cardTitle}>Facturación Mensual</h3>
                <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={onGenerate} style={styles.actionButton}>Generar Facturas del Mes</button>
                    <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar</button>
                </div>
            </div>
            <div style={styles.listContainer}>
                {invoices.length > 0 ? invoices.map(inv => (
                    <div key={inv.id} style={styles.listItem}>
                        <div><p style={styles.listItemName}>{inv.childName}</p><p style={styles.listItemInfo}>Fecha: {inv.date} | Base: {inv.base}{config.currency} + Penaliz: {inv.penalties}{config.currency}</p></div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}><strong style={{fontSize: '16px'}}>{inv.amount.toFixed(2)}{config.currency}</strong><select value={inv.status} onChange={(e) => handleStatusChange(inv.id, e.target.value as Invoice['status'])} style={styles.formInputSmall}><option value="Pendiente">Pendiente</option><option value="Pagada">Pagada</option><option value="Vencida">Vencida</option></select></div>
                    </div>
                )) : <p>No hay facturas generadas. Haz clic en el botón para crearlas.</p>}
            </div>
        </div>
    );
};

export default Invoicing;