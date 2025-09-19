// Contenido para: src/components/tabs/AttendanceManager.tsx
import { useState } from 'react'; //
import { Download, Save } from 'lucide-react'; //
import { styles } from '../../styles'; //
import type { Student, Attendance } from '../../types'; //

interface AttendanceManagerProps {
    students: Student[]; //
    attendance: Attendance[]; //
    onSave: (data: Omit<Attendance, 'id' | 'childId'> & {childId: number}) => void; //
    onExport: () => void; //
}

const AttendanceManager = ({ students, attendance, onSave, onExport }: AttendanceManagerProps) => { //
    const today = new Date().toISOString().split('T')[0]; //
    const [attendanceData, setAttendanceData] = useState<Record<number, Partial<Omit<Attendance, 'id' | 'childId' | 'childName' | 'date'>>>>({}); //
    
    // --- INICIO DE CAMBIOS ---
    const [searchTerm, setSearchTerm] = useState(''); // Añadido estado para la búsqueda

    const handleAttendanceChange = (childId: number, field: keyof Omit<Attendance, 'id' | 'childId' | 'childName' | 'date'>, value: string) => { setAttendanceData(prev => ({ ...prev, [childId]: { ...prev[childId], [field]: value } })); }; //
    const handleSaveClick = (childId: number, childName: string) => { const dataToSave = { childId, childName, date: today, ...attendanceData[childId] }; onSave(dataToSave as any); }; //

    // Añadida lógica de filtrado y ordenación
    const filteredAndSortedStudents = students
        .filter(student =>
            `${student.name} ${student.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) =>
            `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)
        );
    // --- FIN DE CAMBIOS ---

    return (
        <div style={styles.card}> {/* */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}> {/* */}
                 <h3 style={{...styles.cardTitle, margin:0}}>Control de Asistencia - {new Date(today).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3> {/* */}
                 
                 {/* --- INICIO DE CAMBIOS (Input de búsqueda añadido) --- */}
                 <div style={{display: 'flex', gap: '10px'}}>
                    <input
                        type="text"
                        placeholder="Buscar alumno..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{...styles.formInputSmall, width: '250px'}}
                    />
                    <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar</button> {/* */}
                 </div>
                 {/* --- FIN DE CAMBIOS --- */}
            </div>
            <div style={styles.listContainer}> {/* */}
                {/* --- INICIO DE CAMBIOS (mapeo sobre la lista filtrada) --- */}
                {filteredAndSortedStudents.map(student => { // Modificado
                {/* --- FIN DE CAMBIOS --- */}
                    const todayAttendance = attendance.find(a => a.childId === student.numericId && a.date === today); //
                    const currentData = attendanceData[student.numericId] || {}; //
                    return (
                        <div key={student.id} style={styles.attendanceItem}> {/* */}
                            <p style={styles.listItemName}>{student.name} {student.surname}</p> {/* */}
                            <div style={styles.attendanceGrid}> {/* */}
                                <input type="time" style={styles.formInputSmall} defaultValue={todayAttendance?.entryTime} onChange={(e) => handleAttendanceChange(student.numericId, 'entryTime', e.target.value)} /> {/* */}
                                <input type="text" placeholder="Quién lo deja" style={styles.formInputSmall} defaultValue={todayAttendance?.droppedOffBy} onChange={(e) => handleAttendanceChange(student.numericId, 'droppedOffBy', e.target.value)} /> {/* */}
                                <input type="time" style={styles.formInputSmall} defaultValue={todayAttendance?.exitTime} onChange={(e) => handleAttendanceChange(student.numericId, 'exitTime', e.target.value)} /> {/* */}
                                <input type="text" placeholder="Quién lo recoge" style={styles.formInputSmall} defaultValue={todayAttendance?.pickedUpBy} onChange={(e) => handleAttendanceChange(student.numericId, 'pickedUpBy', e.target.value)} /> {/* */}
                                <button style={styles.saveButton} onClick={() => handleSaveClick(student.numericId, `${student.name} ${student.surname}`)} disabled={!currentData.entryTime && !currentData.exitTime}><Save size={16} /></button> {/* */}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AttendanceManager; //