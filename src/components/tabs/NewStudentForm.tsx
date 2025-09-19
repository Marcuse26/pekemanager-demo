// Contenido COMPLETO para: src/components/tabs/NewStudentForm.tsx

import React from 'react'; 
import { styles } from '../../styles';
import type { StudentFormData, Schedule } from '../../types';

// Definimos las Props que este componente espera recibir de App.tsx
interface NewStudentFormProps {
    onAddChild: (e: React.FormEvent) => void;
    childForm: StudentFormData;
    onFormChange: React.Dispatch<React.SetStateAction<StudentFormData>>;
    schedules: Schedule[];
}

// Lógica del componente (copiada de tu App.tsx original)
const NewStudentForm = ({ onAddChild, childForm, onFormChange, schedules }: NewStudentFormProps) => {
  
  // Este componente no tiene estado propio (lo recibe todo por props), 
  // pero sí necesita esta función interna para comunicar los cambios al componente App.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { 
      const { name, value, type } = e.target; 
      const isCheckbox = type === 'checkbox'; 
      onFormChange(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value })); 
  };
  
  return (
    <div style={styles.card}><h3 style={styles.cardTitle}>Ficha de Inscripción</h3>
        <form onSubmit={onAddChild}>
            <div style={styles.formGrid}>
                <input name="name" value={childForm.name} onChange={handleInputChange} placeholder="Nombre del Alumno" style={styles.formInput} required />
                <input name="surname" value={childForm.surname} onChange={handleInputChange} placeholder="Apellidos" style={styles.formInput} required />
                
                {/* --- INICIO DE CAMBIOS --- */}
                <div>
                    <label style={styles.formLabel}>Fecha de Nacimiento</label>
                    <input name="birthDate" type="date" value={childForm.birthDate} onChange={handleInputChange} style={{...styles.formInput, marginBottom: 0}} required />
                </div>
                <div>
                    <label style={styles.formLabel}>Fecha de Alta</label>
                    <input name="startMonth" type="date" value={childForm.startMonth || ''} onChange={handleInputChange} style={{...styles.formInput, marginBottom: 0}} />
                </div>
                <div style={{gridColumn: '1 / -1'}}>
                    <label style={styles.formLabel}>Fecha de Baja (Opcional)</label>
                    <input name="plannedEndMonth" type="date" value={childForm.plannedEndMonth || ''} onChange={handleInputChange} style={{...styles.formInput, marginBottom: 0}} />
                </div>
                {/* --- FIN DE CAMBIOS --- */}

                <input name="address" value={childForm.address} onChange={handleInputChange} placeholder="Dirección Completa" style={{...styles.formInput, gridColumn: '1 / -1'}} />
                <input name="fatherName" value={childForm.fatherName} onChange={handleInputChange} placeholder="Nombre del Padre" style={styles.formInput} />
                <input name="phone1" type="tel" value={childForm.phone1} onChange={handleInputChange} placeholder="Teléfono 1" style={styles.formInput} required />
                <input name="motherName" value={childForm.motherName} onChange={handleInputChange} placeholder="Nombre de la Madre" style={styles.formInput} />
                <input name="phone2" type="tel" value={childForm.phone2} onChange={handleInputChange} placeholder="Teléfono 2" style={styles.formInput} />
                <input name="parentEmail" type="email" value={childForm.parentEmail} onChange={handleInputChange} placeholder="Email de Contacto" style={{...styles.formInput, gridColumn: '1 / -1'}} />
                <select name="schedule" value={childForm.schedule} onChange={handleInputChange} style={{...styles.formInput, gridColumn: '1 / -1'}} required><option value="">Seleccionar horario...</option>{schedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.price}€)</option>)}</select>
                <select name="paymentMethod" value={childForm.paymentMethod} onChange={handleInputChange} style={{...styles.formInput, gridColumn: '1 / -1'}} required>
                    <option value="">Seleccionar método de pago...</option>
                    <option value="Cheque guardería">Cheque guardería</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Domiciliación">Domiciliación Bancaria</option>
                </select>
                <input name="accountHolderName" value={childForm.accountHolderName} onChange={handleInputChange} placeholder="Titular de la cuenta bancaria" style={{...styles.formInput, gridColumn: '1 / -1'}} />
                 <input name="nif" value={childForm.nif || ''} onChange={handleInputChange} placeholder="NIF/DNI del Titular" style={{...styles.formInput, gridColumn: '1 / -1'}} />
                <input name="authorizedPickup" value={childForm.authorizedPickup} onChange={handleInputChange} placeholder="Personas autorizadas para la recogida" style={{...styles.formInput, gridColumn: '1 / -1'}} />
            </div>
            <textarea name="allergies" value={childForm.allergies} onChange={handleInputChange} placeholder="Alergias y notas médicas..." style={{...styles.formInput, width: 'calc(100% - 24px)', gridColumn: '1 / -1'}} rows={3}></textarea>
            <div style={{gridColumn: '1 / -1', display: 'flex', gap: '20px', alignItems: 'center', marginTop: '10px'}}><label style={styles.checkboxLabel}><input type="checkbox" name="enrollmentPaid" checked={childForm.enrollmentPaid} onChange={handleInputChange} /> Matrícula Pagada (100€)</label></div>
            <button type="submit" style={{...styles.submitButton, gridColumn: '1 / -1'}}>Inscribir Alumno</button>
        </form>
    </div>
  );
};

export default NewStudentForm;