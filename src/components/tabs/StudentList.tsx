// Contenido para: src/components/tabs/StudentList.tsx
import { useState, useMemo } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { styles } from '../../styles';
import type { Student } from '../../types';

interface StudentListProps {
    students: Student[];
    onSelectChild: (student: Student) => void;
    onDeleteChild: (id: string, name: string) => void;
    onExport: () => void;
}

// --- LÓGICA DE FECHAS ---
const today = new Date();
today.setHours(0, 0, 0, 0); // Normalizar a medianoche

const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const lastDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

const isStudentActive = (student: Student, date: Date): boolean => {
    if (!student.startMonth) return false; // No puede estar activo si no tiene fecha de alta
    
    const startDate = new Date(student.startMonth);
    const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

    // Está activo si:
    // 1. Su alta es hoy o antes
    // 2. Y (no tiene fecha de baja O su fecha de baja es hoy o después)
    return startDate <= date && (!endDate || endDate >= date);
};

const isStudentActiveThisMonth = (student: Student): boolean => {
    if (!student.startMonth) return false;
    
    const startDate = new Date(student.startMonth);
    const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

    // Casos para estar activo este mes:
    // 1. Empezó antes de este mes y (no tiene baja O la baja es después de que empiece este mes)
    // 2. Empezó este mes
    const startsBeforeOrDuringMonth = startDate <= lastDayThisMonth;
    const endsAfterOrDuringMonth = !endDate || endDate >= firstDayThisMonth;

    return startsBeforeOrDuringMonth && endsAfterOrDuringMonth;
}

const isStudentForNextMonth = (student: Student): boolean => {
    if (!student.startMonth) return false;
    const startDate = new Date(student.startMonth);
    return startDate >= firstDayNextMonth && startDate <= lastDayNextMonth;
}
// --- FIN LÓGICA DE FECHAS ---


const StudentList = ({ students, onSelectChild, onDeleteChild, onExport }: StudentListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'activos' | 'todos' | 'proximos'>('activos');

  // Filtramos por búsqueda primero
  const filteredStudents = useMemo(() => {
    return students.filter(student =>
        `${student.name} ${student.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  // --- Listas Memoizadas para cada sub-pestaña ---

  // 1. Lista "Activos"
  const activeStudents = useMemo(() => {
      return filteredStudents
          .filter(isStudentActiveThisMonth)
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents]);

  // 2. Lista "Todos" (con estado)
  const allStudentsWithStatus = useMemo(() => {
      const today = new Date();
      return filteredStudents
          .map(student => ({
              ...student,
              isCurrentlyActive: isStudentActive(student, today)
          }))
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents]);

  // 3. Lista "Próximo Mes"
  const nextMonthStudents = useMemo(() => {
      return filteredStudents
          .filter(isStudentForNextMonth)
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents]);
  
  // --- Renderizado de la lista basado en la pestaña activa ---
  const renderList = () => {
    let listToRender: (Student & { isCurrentlyActive?: boolean })[] = [];
    
    switch(activeSubTab) {
        case 'activos':
            listToRender = activeStudents;
            break;
        case 'todos':
            listToRender = allStudentsWithStatus;
            break;
        case 'proximos':
            listToRender = nextMonthStudents;
            break;
    }

    return listToRender.map(child => (
        <div key={child.id} style={styles.listItem}>
            <div>
                <p style={styles.listItemName}>{child.name} {child.surname}</p>
                <p style={styles.listItemInfo}>
                    Titular: {child.accountHolderName || 'No especificado'}
                    {activeSubTab === 'todos' && child.isCurrentlyActive === false && (
                        <span style={{...styles.listItemInfo, marginLeft: '10px', color: '#dc3545'}}>
                            (Alta: {child.startMonth || 'N/A'} {child.plannedEndMonth ? `- Baja: ${child.plannedEndMonth}` : ''})
                        </span>
                    )}
                </p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {activeSubTab === 'todos' && (
                    child.isCurrentlyActive ? (
                        <span style={styles.pillSuccess}>Activo</span>
                    ) : (
                        <span style={styles.pillInactive}>Inactivo</span>
                    )
                )}
                <button onClick={() => onSelectChild(child)} style={styles.pillInfo}>Ver Ficha</button>
                <button onClick={() => onDeleteChild(child.id, `${child.name} ${child.surname}`)} style={styles.deleteButton}><Trash2 size={14}/></button>
            </div>
        </div>
    ));
  };
  
  const getActiveListCount = () => {
    switch(activeSubTab) {
        case 'activos': return activeStudents.length;
        case 'todos': return allStudentsWithStatus.length;
        case 'proximos': return nextMonthStudents.length;
    }
  }

  return (
    <div style={styles.card}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
            <h3 style={{...styles.cardTitle, margin: 0}}>Alumnos Inscritos ({getActiveListCount()})</h3>
            <div style={{display: 'flex', gap: '10px'}}>
                <input
                    type="text"
                    placeholder="Buscar alumno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{...styles.formInputSmall, width: '250px'}}
                />
                 <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar Todo</button>
            </div>
        </div>

        {/* --- CONTENEDOR DE SUB-PESTAÑAS --- */}
        <div style={styles.subTabContainer}>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'activos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('activos')}
            >
                Activos este mes ({activeStudents.length})
            </button>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'proximos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('proximos')}
            >
                Próximo mes ({nextMonthStudents.length})
            </button>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'todos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('todos')}
            >
                Historial ({allStudentsWithStatus.length})
            </button>
        </div>
        
        {/* El contenedor de la lista ahora usa el estilo modificado con altura fija */}
        <div style={styles.listContainer}>
            {renderList()}
        </div>
    </div>
  );
};

export default StudentList;