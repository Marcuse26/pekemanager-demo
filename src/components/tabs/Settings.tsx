// Contenido para: src/components/tabs/Settings.tsx
import React, { useState, useEffect } from 'react';
import { styles } from '../../styles';
import type { Config } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface SettingsProps {
    onSave: (config: Config) => void;
    addNotification: (message: string) => void;
}

const Settings = ({ onSave, addNotification }: SettingsProps) => {
    const { config } = useAppContext();
    const [localConfig, setLocalConfig] = useState(config);
    useEffect(() => setLocalConfig(config), [config]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setLocalConfig(prev => ({ ...prev, [name]: name === 'lateFee' ? Number(value) : value })); };
    const handleSave = (e: React.FormEvent) => { 
        e.preventDefault(); 
        onSave(localConfig); 
        addNotification('Configuración guardada.'); 
    };
    return (
        <div style={styles.card}><h3 style={styles.cardTitle}>Configuración General</h3>
            <form onSubmit={handleSave}>
                <label style={styles.formLabel}>Nombre del Centro</label><input name="centerName" value={localConfig.centerName} onChange={handleChange} style={styles.formInput} />
                <label style={styles.formLabel}>Moneda</label><input name="currency" value={localConfig.currency} onChange={handleChange} style={styles.formInput} />
                <label style={styles.formLabel}>Tarifa de Penalización por Retraso (por cada 15 min)</label><input name="lateFee" type="number" value={localConfig.lateFee} onChange={handleChange} style={styles.formInput} />
                <button type="submit" style={styles.submitButton}>Guardar Configuración</button>
            </form>
        </div>
    );
};

export default Settings;