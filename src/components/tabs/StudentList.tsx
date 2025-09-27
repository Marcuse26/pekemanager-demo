// Contenido para: src/components/tabs/StudentList.tsx
import { useState, useMemo } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { styles } from '../../styles';
import { useAppContext } from '../../context/AppContext';
import type { Student } from '../../types';

// --- LÓGICA DE FECHAS CORREGIDA ---
const today = new Date();
today.setHours(0, 0, 0, 0);

const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const firstDayAfterNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);

const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
};

const isStudentActiveThisMonth = (student: Student): boolean => {
    const startDate = parseDate(student.startMonth || '');
    if (!startDate) return false;
    const endDate = parseDate(student.plannedEndMonth || '');
    return startDate < firstDayNextMonth && (!endDate || endDate >= firstDayThisMonth);
}
const isStudentActiveLastMonth = (student: Student): boolean => {
    const startDate = parseDate(student.startMonth || '');
    if (!startDate) return false;
    const endDate = parseDate(student.plannedEndMonth || '');
    return startDate < firstDayThisMonth && (!endDate || endDate >= firstDayLastMonth);
}
const isStudentActiveNextMonth = (student: Student): boolean => {
    const startDate = parseDate(student.startMonth || '');
    if (!startDate) return false;
    const endDate = parseDate(student.plannedEndMonth || '');
    return startDate < firstDayAfterNextMonth && (!endDate || endDate >= firstDayNextMonth);
}
// --- FIN LÓGICA DE FECHAS ---

interface StudentListProps {
    onSelectChild: (student: Student) => void;
    onDeleteChild: (id: string, name: string) => void;
    onExport: () => void;
}

const StudentList = ({ onSelectChild, onDeleteChild, onExport }: StudentListProps) => {
  const { students } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'activos' | 'inactivos' | 'pasados' | 'proximos' | 'todos'>('activos');

  const filteredStudents = useMemo(() => students.filter(student => `${student.name} ${student.surname}`.toLowerCase().includes(searchTerm.toLowerCase())), [students, searchTerm]);

  const activeStudents = useMemo(() => filteredStudents.filter(isStudentActiveThisMonth).sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)), [filteredStudents]);
  const inactiveStudents = useMemo(() => filteredStudents.filter(student => !isStudentActiveThisMonth(student)).sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)), [filteredStudents]);
  const lastMonthActiveStudents = useMemo(() => filteredStudents.filter(student => isStudentActiveLastMonth(student) && !isStudentActiveThisMonth(student)).sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)), [filteredStudents]);
  const nextMonthStudents = useMemo(() => filteredStudents.filter(isStudentActiveNextMonth).sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)), [filteredStudents]);
  const allStudentsWithStatus = useMemo(() => filteredStudents.map(student => ({ ...student, isCurrentlyActive: isStudentActiveThisMonth(student) })).sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)), [filteredStudents]);

  const renderList = () => {
    let listToRender: (Student & { isCurrentlyActive?: boolean })[] = [];
    switch(activeSubTab) {
        case 'activos': listToRender = activeStudents; break;
        case 'inactivos': listToRender = inactiveStudents; break;
        case 'pasados': listToRender = lastMonthActiveStudents; break;
        case 'proximos': listToRender = nextMonthStudents; break;
        case 'todos': listToRender = allStudentsWithStatus; break;
    }
    return listToRender.map(child => (
        <div key={child.id} style={styles.listItem}>
            <div>
                <p style={styles.listItemName}>{child.name} {child.surname}</p>
                <p style={styles.listItemInfo}>
                    Titular: {child.accountHolderName || 'No especificado'}
                    <span style={{...styles.listItemInfo, marginLeft: '10px', color: '#dc3545'}}>
                        (Alta: {child.startMonth || 'N/A'} {child.plannedEndMonth ? `- Baja: ${child.plannedEndMonth}` : '- Baja: N/A'})
                    </span>
                </p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {activeSubTab === 'todos' && ( child.isCurrentlyActive ? (<span style={styles.pillSuccess}>Activo</span>) : (<span style={styles.pillInactive}>Inactivo</span>) )}
                <button onClick={() => onSelectChild(child)} style={styles.pillInfo}>Ver Ficha</button>
                <button onClick={() => onDeleteChild(child.id, `${child.name} ${child.surname}`)} style={styles.deleteButton}><Trash2 size={14}/></button>
            </div>
        </div>
    ));
  };
  
  const getActiveListCount = () => {
    switch(activeSubTab) {
        case 'activos': return activeStudents.length;
        case 'inactivos': return inactiveStudents.length;
        case 'pasados': return lastMonthActiveStudents.length;
        case 'proximos': return nextMonthStudents.length;
        case 'todos': return allStudentsWithStatus.length;
    }
  }

  return (
    <div style={styles.card}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
            <h3 style={{...styles.cardTitle, margin: 0}}>Alumnos Inscritos ({getActiveListCount()})</h3>
            <div style={{display: 'flex', gap: '10px'}}>
                <input type="text" placeholder="Buscar alumno..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{...styles.formInputSmall, width: '250px'}} />
                 <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar Alumnos</button>
            </div>
        </div>
        <div style={styles.subTabContainer}>
            <button style={{...styles.subTabButton, ...(activeSubTab === 'activos' ? styles.subTabButtonActive : {})}} onClick={() => setActiveSubTab('activos')}> Activos ({activeStudents.length}) </button>
            <button style={{...styles.subTabButton, ...(activeSubTab === 'inactivos' ? styles.subTabButtonActive : {})}} onClick={() => setActiveSubTab('inactivos')}> Inactivos ({inactiveStudents.length}) </button>
            <button style={{...styles.subTabButton, ...(activeSubTab === 'pasados' ? styles.subTabButtonActive : {})}} onClick={() => setActiveSubTab('pasados')}> Activos (mes anterior) ({lastMonthActiveStudents.length}) </button>
            <button style={{...styles.subTabButton, ...(activeSubTab === 'proximos' ? styles.subTabButtonActive : {})}} onClick={() => setActiveSubTab('proximos')}> Activos (próximo mes) ({nextMonthStudents.length}) </button>
            <button style={{...styles.subTabButton, ...(activeSubTab === 'todos' ? styles.subTabButtonActive : {})}} onClick={() => setActiveSubTab('todos')}> Todos ({allStudentsWithStatus.length}) </button>
        </div>
        <div style={styles.listContainer}>
            {renderList()}
        </div>
    </div>
  );
};

export default StudentList;