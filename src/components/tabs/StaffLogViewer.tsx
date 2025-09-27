import { useState } from 'react';
import { Download, Save, X, Edit } from 'lucide-react';
import { styles } from '../../styles';
import type { StaffTimeLog } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface StaffLogViewerProps {
    onExport: () => void; 
    staffUsers: string[];
    onUpdateStaffTimeLog: (logId: string, updatedData: Partial<StaffTimeLog>) => void;
}

const StaffLogViewer = ({ onExport, staffUsers, onUpdateStaffTimeLog }: StaffLogViewerProps) => {
    const { staffTimeLogs: logs } = useAppContext();
    const [filterUser, setFilterUser] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editCheckIn, setEditCheckIn] = useState('');
    const [editCheckOut, setEditCheckOut] = useState('');

    const filteredLogs = logs.filter(log => {
        const matchUser = !filterUser || log.userName === filterUser;
        const matchDate = !filterDate || log.date === filterDate;
        return matchUser && matchDate;
    }).sort((a, b) => {
        const dateComparison = b.date.localeCompare(a.date);
        if (dateComparison !== 0) return dateComparison;
        return b.checkIn.localeCompare(a.checkIn);
    });

    const handleEditClick = (log: StaffTimeLog) => {
        setEditingLogId(log.id);
        setEditCheckIn(log.checkIn);
        setEditCheckOut(log.checkOut || ''); 
    };

    const handleSaveEdit = (logId: string) => {
        onUpdateStaffTimeLog(logId, { checkIn: editCheckIn, checkOut: editCheckOut });
        setEditingLogId(null);
    };

    const handleCancelEdit = () => { setEditingLogId(null); };

    return (
        <div style={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h3 style={{...styles.cardTitle, margin: 0}}>Historial de Fichajes del Personal</h3>
                <div style={{display: 'flex', gap: '10px'}}>
                    <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} style={styles.formInputSmall}>
                        <option value="">Todos los usuarios</option>
                        {staffUsers.map(user => <option key={user} value={user}>{user}</option>)}
                    </select>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={styles.formInputSmall} />
                    <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar Personal</button>
                </div>
            </div>
            <div style={styles.listContainer}>
                {filteredLogs.length > 0 ? filteredLogs.map(log => (
                    <div key={log.id} style={styles.listItem}>
                        <div>
                            <p style={styles.listItemName}>{log.userName}</p>
                            <p style={styles.listItemInfo}>Fecha: {log.date}</p>
                        </div>
                        {editingLogId === log.id ? (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="time" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} style={{ ...styles.formInputSmall, width: '100px' }} />
                                <input type="time" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} style={{ ...styles.formInputSmall, width: '100px' }} />
                                <button onClick={() => handleSaveEdit(log.id)} style={{...styles.actionButton, backgroundColor: '#28a745', padding: '6px 10px'}} title="Guardar"><Save size={14}/></button>
                                <button onClick={handleCancelEdit} style={{...styles.actionButton, backgroundColor: '#6c757d', padding: '6px 10px'}} title="Cancelar"><X size={14}/></button>
                            </div>
                        ) : (
                            <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                                <span style={styles.pillSuccess}>Entrada: {log.checkIn}</span>
                                <span style={styles.pillWarning}>{log.checkOut ? `Salida: ${log.checkOut}` : 'Salida Pendiente'}</span>
                                <button onClick={() => handleEditClick(log)} style={{...styles.actionButton, backgroundColor: '#ffc107', padding: '6px 10px'}} title="Editar"><Edit size={14}/></button>
                            </div>
                        )}
                    </div>
                )) : <p>No hay registros de fichaje que coincidan con los filtros.</p>}
            </div>
        </div>
    );
};
export default StaffLogViewer;