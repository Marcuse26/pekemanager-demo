// Contenido para: src/components/tabs/PenaltiesViewer.tsx
import React, { useState } from 'react';
import { Download, Edit, Trash2, Save, X } from 'lucide-react';
import { styles } from '../../styles';
import type { Penalty, Config } from '../../types';

interface PenaltiesViewerProps {
    penalties: Penalty[];
    config: Config;
    onExport: () => void;
    onUpdatePenalty: (id: string, data: Partial<Omit<Penalty, 'id'>>) => void;
    onDeletePenalty: (id: string) => void;
}

const PenaltiesViewer = ({ penalties, config, onExport, onUpdatePenalty, onDeletePenalty }: PenaltiesViewerProps) => {
    const [editingPenalty, setEditingPenalty] = useState<Penalty | null>(null);
    const [editedData, setEditedData] = useState<{amount: number, reason: string}>({ amount: 0, reason: '' });

    const handleEditClick = (penalty: Penalty) => {
        setEditingPenalty(penalty);
        setEditedData({ amount: penalty.amount, reason: penalty.reason });
    };

    const handleCancelClick = () => {
        setEditingPenalty(null);
    };

    const handleSaveClick = () => {
        if (editingPenalty) {
            onUpdatePenalty(editingPenalty.id, editedData);
            setEditingPenalty(null);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedData(prev => ({...prev, [name]: name === 'amount' ? Number(value) : value }));
    };

    return (
        <div style={styles.card}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={styles.cardTitle}>Registro de Penalizaciones</h3>
                {/* --- INICIO DE CAMBIO: Texto del botón --- */}
                <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar Penalizaciones</button>
                {/* --- FIN DE CAMBIO --- */}
            </div>
            <div style={styles.listContainer}>
                {penalties.length > 0 ? penalties.map(penalty => (
                    <div key={penalty.id} style={styles.listItem}>
                        {editingPenalty?.id === penalty.id ? (
                            <div style={{width: '100%', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <input 
                                    type="number" 
                                    name="amount" 
                                    value={editedData.amount} 
                                    onChange={handleInputChange}
                                    style={{...styles.formInputSmall, width: '100px'}}
                                />
                                <input 
                                    type="text" 
                                    name="reason" 
                                    value={editedData.reason} 
                                    onChange={handleInputChange}
                                    style={{...styles.formInputSmall, flex: 1}}
                                />
                                <button onClick={handleSaveClick} style={styles.saveButton}><Save size={16} /></button>
                                <button onClick={handleCancelClick} style={styles.deleteButton}><X size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <p style={styles.listItemName}>{penalty.childName}</p>
                                    <p style={styles.listItemInfo}>Fecha: {penalty.date} - {penalty.reason}</p>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                     <span style={styles.pillWarning}>{penalty.amount}{config.currency}</span>
                                     <button onClick={() => handleEditClick(penalty)} style={{...styles.actionButton, backgroundColor: '#ffc107', padding: '5px 8px'}}><Edit size={14}/></button>
                                     <button onClick={() => onDeletePenalty(penalty.id)} style={styles.deleteButton}><Trash2 size={14}/></button>
                                </div>
                            </>
                        )}
                    </div>
                )) : <p>No hay penalizaciones registradas.</p>}
            </div>
        </div>
    );
};

export default PenaltiesViewer;