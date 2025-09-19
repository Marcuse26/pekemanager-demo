// Contenido para: src/components/StaffControlPanel.tsx
// ... (y las otras importaciones que necesita, como los iconos y 'styles')
import { LogIn, LogOut } from 'lucide-react';
import { styles } from '../styles';
import type { StaffTimeLog } from '../types';

interface StaffControlPanelProps {
    currentUser: string;
    todayLog: StaffTimeLog | undefined;
    onCheckIn: () => void;
    onCheckOut: () => void;
}

const StaffControlPanel = ({ currentUser, todayLog, onCheckIn, onCheckOut }: StaffControlPanelProps) => {

    const hasCheckedIn = todayLog && todayLog.checkIn;
    const hasCheckedOut = todayLog && todayLog.checkOut;

    return (
        <div style={styles.card}>
            <h3 style={styles.cardTitle}>Control Horario: {currentUser}</h3>
            <p style={{textAlign: 'center', fontSize: '18px', margin: '20px 0'}}>Fecha: {new Date().toLocaleDateString('es-ES')}</p>
            
            <div style={{display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '30px'}}>
                <button 
                    onClick={onCheckIn} 
                    disabled={!!hasCheckedIn} 
                    style={{
                        ...styles.submitButton, 
                        width: '200px', 
                        backgroundColor: hasCheckedIn ? '#6c757d' : '#28a745',
                        cursor: hasCheckedIn ? 'not-allowed' : 'pointer'
                    }}
                >
                    <LogIn size={18} style={{marginRight: '10px'}} /> 
                    {hasCheckedIn ? `Entrada: ${todayLog.checkIn}` : 'Registrar ENTRADA'}
                </button>
                
                <button 
                    onClick={onCheckOut} 
                    disabled={!hasCheckedIn || !!hasCheckedOut}
                    style={{
                        ...styles.submitButton, 
                        width: '200px', 
                        backgroundColor: !hasCheckedIn ? '#6c757d' : (hasCheckedOut ? '#6c757d' : '#dc3545'),
                        cursor: !hasCheckedIn || !!hasCheckedOut ? 'not-allowed' : 'pointer'
                    }}
                >
                    <LogOut size={18} style={{marginRight: '10px'}} /> 
                    {hasCheckedOut ? `Salida: ${todayLog.checkOut}` : 'Registrar SALIDA'}
                </button>
            </div>
            {hasCheckedOut && <p style={{textAlign: 'center', color: '#28a745', marginTop: '30px', fontSize: '18px'}}>Jornada completada. ¡Gracias!</p>}
        </div>
    );
};

export default StaffControlPanel;