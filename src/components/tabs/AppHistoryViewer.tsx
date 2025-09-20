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

    // --- INICIO DE CAMBIO: Lógica de ordenación robusta ---

    // Helper para parsear CUALQUIER formato de fecha (antiguo o nuevo)
    const parseTimestamp = (timestamp: string): number => {
        if (!timestamp) return 0;
        // Formato Nuevo (ISO String): "2025-09-21T01:10:00.123Z"
        if (timestamp.includes('T') && timestamp.includes('Z')) {
            return new Date(timestamp).getTime();
        }
        // Formato Antiguo (es-ES): "21/9/2025, 1:10:00"
        if (timestamp.includes('/') && timestamp.includes(',')) {
            try {
                const [datePart, timePart] = timestamp.split(', ');
                const [day, month, year] = datePart.split('/').map(Number);
                const [hour, minute, second] = timePart.split(':').map(Number);
                // new Date(año, mes (0-11), dia, hora, min, seg)
                return new Date(year, month - 1, day, hour, minute, second).getTime();
            } catch (e) {
                return 0; // Si falla el parseo, va al final
            }
        }
        // Si es cualquier otra cosa
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return 0;
        }
        return date.getTime();
    };

    const filteredHistory = history.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp)); // Ordenar usando el helper
    
    // --- FIN DE CAMBIO ---

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
                    <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar Historial</button>
                </div>
            </div>
            <div style={styles.listContainer}>
                {filteredHistory.length > 0 ? filteredHistory.map(log => (
                    <div key={log.id} style={styles.listItem}>
                        <div>
                            <p style={styles.listItemName}>{log.action}: <span style={{fontWeight: 'normal'}}>{log.details}</span></p>
                            {/* Formatear fecha usando el mismo parser para asegurar */}
                            <p style={styles.listItemInfo}>Realizado por <strong>{log.user}</strong> el {log.timestamp ? new Date(parseTimestamp(log.timestamp)).toLocaleString('es-ES') : 'Fecha inválida'}</p>
                        </div>
                    </div>
                )) : <p>No hay actividad registrada.</p>}
            </div>
        </div>
    );
};

export default AppHistoryViewer;