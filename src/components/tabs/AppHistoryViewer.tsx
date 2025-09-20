// Contenido para: src/components/tabs/AppHistoryViewer.tsx
import { useState } from 'react';
import { Download } from 'lucide-react';
import { styles } from '../../styles';
import type { AppHistoryLog } from '../../types';

interface AppHistoryViewerProps {
    history: AppHistoryLog[];
    onExport: () => void;
}

const AppHistoryViewer = ({ history, onExport }: AppHistoryViewerProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredHistory = history.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Esto funciona con ISO strings

    return (
        <div style={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h3 style={{...styles.cardTitle, margin: 0}}>Historial de Actividad General</h3>
                <div style={{display: 'flex', gap: '10px'}}>
                    <input
                        type="text"
                        placeholder="Buscar en historial..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{...styles.formInputSmall, width: '250px'}}
                    />
                    {/* --- INICIO DE CAMBIO: Texto del botón --- */}
                    <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar Historial</button>
                    {/* --- FIN DE CAMBIO --- */}
                </div>
            </div>
            <div style={styles.listContainer}>
                {filteredHistory.length > 0 ? filteredHistory.map(log => (
                    <div key={log.id} style={styles.listItem}>
                        <div>
                            <p style={styles.listItemName}>{log.action}: <span style={{fontWeight: 'normal'}}>{log.details}</span></p>
                            {/* --- INICIO DE CAMBIO: Formatear fecha ISO --- */}
                            <p style={styles.listItemInfo}>Realizado por <strong>{log.user}</strong> el {new Date(log.timestamp).toLocaleString('es-ES')}</p>
                            {/* --- FIN DE CAMBIO --- */}
                        </div>
                    </div>
                )) : <p>No hay actividad registrada.</p>}
            </div>
        </div>
    );
};

export default AppHistoryViewer;