import { useRef } from 'react';
import { styles } from '../../styles';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

export const ConfirmModal = ({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void; }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(modalRef, onCancel);
    return (
        <div style={styles.modalBackdrop}>
            <div style={{...styles.modalContent, maxWidth: '400px'}} ref={modalRef}>
                <h3 style={styles.cardTitle}>Confirmación</h3>
                <p>{message}</p>
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'}}>
                    <button onClick={onCancel} style={{...styles.actionButton, backgroundColor: '#6c757d'}}>Cancelar</button>
                    <button onClick={onConfirm} style={{...styles.actionButton, backgroundColor: '#dc3545'}}>Confirmar</button>
                </div>
            </div>
        </div>
    );
};