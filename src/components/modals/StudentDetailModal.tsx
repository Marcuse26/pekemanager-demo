// Contenido para: src/components/modals/StudentDetailModal.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, Edit, X, Paperclip, Upload, History, ChevronRight, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { styles } from '../../styles';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import type { Student, Schedule, Document, Invoice } from '../../types';

interface StudentDetailModalProps {
    student: Student;
    onClose: () => void;
    schedules: Schedule[];
    onViewPersonalCalendar: (student: Student) => void;
    onUpdate: (studentId: string, updatedData: Partial<Omit<Student, 'id'>>, currentUser: string) => void;
    onAddDocument: (studentId: string, document: Document, currentUser: string) => void;
    onGenerateAndExportInvoice: (student: Student) => void;
    onGenerateAndExportNextMonthInvoice: (student: Student) => void;
    currentUser: string;
    invoices: Invoice[]; // Prop para recibir las facturas
    onGeneratePastMonthsInvoice: (student: Student) => void; // Prop para la nueva función
}

const StudentDetailModal = ({ student, onClose, schedules, onViewPersonalCalendar, onUpdate, onAddDocument, onGenerateAndExportInvoice, onGenerateAndExportNextMonthInvoice, currentUser, invoices, onGeneratePastMonthsInvoice }: StudentDetailModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(modalRef, onClose);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editedStudent, setEditedStudent] = useState(student);
    const [historyVisible, setHistoryVisible] = useState(false);

    useEffect(() => {
      setEditedStudent(student);
    }, [student]);

    const isStudentActiveNextMonth = (student: Student): boolean => {
        if (!student || !student.startMonth) return false;
        
        const today = new Date();
        const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const lastDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

        const startDate = new Date(student.startMonth);
        const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

        const startsBeforeOrDuringNextMonth = startDate <= lastDayNextMonth;
        const endsAfterOrDuringNextMonth = !endDate || endDate >= firstDayNextMonth;

        return startsBeforeOrDuringNextMonth && endsAfterOrDuringNextMonth;
    }
    
    // --- INICIO DE CAMBIO: Lógica para mostrar el botón de meses anteriores ---
    const hasPastInvoices = useMemo(() => {
        if (!student) return false;
        const today = new Date();
        const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return invoices.some(inv =>
            inv.childId === student.numericId && new Date(inv.date) < firstDayCurrentMonth
        );
    }, [invoices, student]);
    // --- FIN DE CAMBIO ---


    if (!student) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const isCheckbox = type === 'checkbox';
      // @ts-ignore
      setEditedStudent(prev => ({ ...prev!, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };

    const handleSave = () => {
        const { id, ...updateData } = editedStudent;
        onUpdate(student.id, updateData, currentUser);
        setIsEditing(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const newDocument: Document = {
                    id: `doc_${Date.now()}`,
                    name: file.name,
                    data: loadEvent.target?.result as string,
                };
                onAddDocument(student.id, newDocument, currentUser);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const getScheduleName = (id: string) => schedules.find(s => s.id === id)?.name || 'No especificado';
    
    return (
        <div style={styles.modalBackdrop}>
            <div style={{...styles.modalContent, maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto'}} ref={modalRef}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h2 style={styles.cardTitle}>{student.name} {student.surname}</h2>
                    <div>
                        {isEditing ? (
                            <>
                                <button onClick={handleSave} style={{...styles.actionButton, marginRight: '10px'}}><Save size={16} style={{marginRight: '8px'}}/> Guardar Cambios</button>
                                <button onClick={() => setIsEditing(false)} style={{...styles.actionButton, backgroundColor: '#6c757d'}}>Cancelar</button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)} style={styles.actionButton}><Edit size={16} style={{marginRight: '8px'}}/> Editar Ficha</button>
                        )}
                        <button onClick={onClose} style={{...styles.modalCloseButton, position: 'static', marginLeft: '10px'}}><X size={20} /></button>
                    </div>
                </div>
                
                <div style={styles.modalGrid}>
                    <div style={styles.modalSection}>
                        <h3 style={styles.modalSectionTitle}>Datos Personales</h3>
                        <p><strong>F. Nacimiento:</strong> {isEditing ? <input type="date" name="birthDate" value={editedStudent.birthDate} onChange={handleInputChange} style={styles.formInputSmall}/> : student.birthDate}</p>
                        <p><strong>Fecha Alta:</strong> {isEditing ? <input type="date" name="startMonth" value={editedStudent.startMonth || ''} onChange={handleInputChange} style={styles.formInputSmall}/> : student.startMonth || 'No especificada'}</p>
                        <p><strong>Fecha Baja:</strong> {isEditing ? <input type="date" name="plannedEndMonth" value={editedStudent.plannedEndMonth || ''} onChange={handleInputChange} style={styles.formInputSmall}/> : student.plannedEndMonth || 'No especificada'}</p>
                        <p><strong>Dirección:</strong> {isEditing ? <input type="text" name="address" value={editedStudent.address} onChange={handleInputChange} style={styles.formInputSmall}/> : student.address}</p>
                        <p><strong>Alergias:</strong> {isEditing ? <textarea name="allergies" value={editedStudent.allergies} onChange={handleInputChange} style={styles.formInputSmall}/> : student.allergies || 'Ninguna'}</p>
                    </div>
                     <div style={styles.modalSection}>
                        <h3 style={styles.modalSectionTitle}>Contacto</h3>
                        <p><strong>Padre:</strong> {isEditing ? <input name="fatherName" value={editedStudent.fatherName} onChange={handleInputChange} style={styles.formInputSmall}/> : student.fatherName}</p>
                        <p><strong>Teléfono 1:</strong> {isEditing ? <input name="phone1" value={editedStudent.phone1} onChange={handleInputChange} style={styles.formInputSmall}/> : student.phone1}</p>
                        <p><strong>Madre:</strong> {isEditing ? <input name="motherName" value={editedStudent.motherName} onChange={handleInputChange} style={styles.formInputSmall}/> : student.motherName}</p>
                        <p><strong>Teléfono 2:</strong> {isEditing ? <input name="phone2" value={editedStudent.phone2} onChange={handleInputChange} style={styles.formInputSmall}/> : student.phone2}</p>
                        <p><strong>Email:</strong> {isEditing ? <input name="parentEmail" type="email" value={editedStudent.parentEmail} onChange={handleInputChange} style={styles.formInputSmall}/> : student.parentEmail}</p>
                        <p><strong>Autorizados:</strong> {isEditing ? <input name="authorizedPickup" value={editedStudent.authorizedPickup} onChange={handleInputChange} style={styles.formInputSmall}/> : student.authorizedPickup}</p>
                    </div>
                    <div style={{...styles.modalSection, gridColumn: '1 / -1'}}>
                        <h3 style={styles.modalSectionTitle}>Cuotas y Pagos</h3>
                        <p><strong>Horario:</strong> {isEditing ? 
                            <select name="schedule" value={editedStudent.schedule} onChange={handleInputChange} style={styles.formInputSmall}>{schedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.price}€)</option>)}</select> 
                            : getScheduleName(student.schedule)}
                        </p>
                        <p><strong>Método de Pago:</strong> {isEditing ? 
                            <select name="paymentMethod" value={editedStudent.paymentMethod} onChange={handleInputChange} style={styles.formInputSmall}>
                                <option value="Cheque guardería">Cheque guardería</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Domiciliación">Domiciliación</option>
                            </select> 
                            : student.paymentMethod}
                        </p>
                        <p><strong>Titular Cuenta:</strong> {isEditing ? <input name="accountHolderName" value={editedStudent.accountHolderName} onChange={handleInputChange} style={styles.formInputSmall}/> : student.accountHolderName}</p>
                        <p><strong>NIF/DNI:</strong> {isEditing ? <input name="nif" value={editedStudent.nif || ''} onChange={handleInputChange} style={styles.formInputSmall}/> : student.nif || 'No especificado'}</p>
                        <p><strong>Matrícula:</strong> <label style={styles.checkboxLabel}><input type="checkbox" name="enrollmentPaid" checked={editedStudent.enrollmentPaid} onChange={handleInputChange} disabled={!isEditing} /> {editedStudent.enrollmentPaid ? 'Pagada' : 'Pendiente'}</label></p>
                        <p><strong>Horario Ampliado:</strong> <label style={styles.checkboxLabel}><input type="checkbox" name="extendedSchedule" checked={editedStudent.extendedSchedule} onChange={handleInputChange} disabled={!isEditing} /> {editedStudent.extendedSchedule ? 'Activo (+30€)' : 'No'}</label></p>
                    </div>
                </div>

                <div style={{...styles.modalSection, gridColumn: '1 / -1'}}>
                    <h3 style={styles.modalSectionTitle}>Documentos Adjuntos</h3>
                    <div style={{...styles.listContainerSmall, marginBottom: '10px'}}>
                        {student.documents && student.documents.length > 0 ? student.documents.map(doc => (
                            <div key={doc.id} style={styles.subListItem}>
                                <a href={doc.data} download={doc.name} style={{textDecoration: 'none', color: '#007bff'}}><Paperclip size={14} style={{marginRight: '8px'}}/>{doc.name}</a>
                            </div>
                        )) : <p>No hay documentos adjuntos.</p>}
                    </div>
                    <label style={styles.uploadButton}>
                        <Upload size={16} style={{marginRight: '8px'}}/> Adjuntar Documento
                        <input type="file" onChange={handleFileChange} style={{display: 'none'}} />
                    </label>
                </div>
                
                <div style={{...styles.modalSection, gridColumn: '1 / -1'}}>
                    <h3 onClick={() => setHistoryVisible(!historyVisible)} style={{...styles.modalSectionTitle, cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                        <History size={16} style={{marginRight: '8px'}} /> Historial de Modificaciones
                        <ChevronRight size={20} style={{marginLeft: 'auto', transform: historyVisible ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s'}} />
                    </h3>
                    {historyVisible && (
                        <div style={styles.listContainerSmall}>
                            {student.modificationHistory && student.modificationHistory.length > 0 ? [...student.modificationHistory].reverse().map(log => (
                                <div key={log.id} style={styles.subListItem}>
                                    <div>
                                        <p style={{margin: 0, fontSize: '12px', color: '#6c757d'}}><strong>{log.timestamp}</strong> por <strong>{log.user}</strong></p>
                                        <p style={{margin: '4px 0 0 0'}}>{log.changes}</p>
                                    </div>
                                </div>
                            )) : <p>No hay modificaciones registradas.</p>}
                        </div>
                    )}
                </div>

                {/* --- INICIO DE CAMBIO: Botones de exportación actualizados --- */}
                <div style={{display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap'}}>
                     <button onClick={() => onViewPersonalCalendar(student)} style={{...styles.submitButton, flex: 1}}><CalendarIcon size={16} style={{marginRight: '8px'}} /> Ver Calendario Personal</button>
                     <button onClick={() => onGenerateAndExportInvoice(student)} style={{...styles.submitButton, flex: 1, backgroundColor: '#17a2b8'}}><FileText size={16} style={{marginRight: '8px'}} /> Factura Mes Actual</button>
                     {isStudentActiveNextMonth(student) && (
                        <button onClick={() => onGenerateAndExportNextMonthInvoice(student)} style={{...styles.submitButton, flex: 1, backgroundColor: '#28a745'}}><FileText size={16} style={{marginRight: '8px'}} /> Factura Mes Siguiente</button>
                     )}
                     {hasPastInvoices && (
                        <button onClick={() => onGeneratePastMonthsInvoice(student)} style={{...styles.submitButton, flex: 1, backgroundColor: '#ffc107'}}><FileText size={16} style={{marginRight: '8px'}} /> Factura Meses Anteriores</button>
                     )}
                </div>
                {/* --- FIN DE CAMBIO --- */}

            </div>
        </div>
    );
};

export default StudentDetailModal;