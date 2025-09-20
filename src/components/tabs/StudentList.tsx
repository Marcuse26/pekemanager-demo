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

// Rango del mes actual
const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

// --- INICIO DE CAMBIO: Rango del mes pasado ---
const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
// --- FIN DE CAMBIO ---

// Rango del mes que viene
const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const lastDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

/**
 * Comprueba si un alumno está activo *en cualquier momento* de ESTE mes.
 */
const isStudentActiveThisMonth = (student: Student): boolean => {
    if (!student.startMonth) return false;
    
    const startDate = new Date(student.startMonth);
    const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

    const startsBeforeOrDuringMonth = startDate <= lastDayThisMonth;
    const endsAfterOrDuringMonth = !endDate || endDate >= firstDayThisMonth;

    return startsBeforeOrDuringMonth && endsAfterOrDuringMonth;
}

// --- INICIO DE CAMBIO: Nueva función helper ---
/**
 * Comprueba si un alumno estuvo activo *en cualquier momento* del MES PASADO.
 */
const isStudentActiveLastMonth = (student: Student): boolean => {
    if (!student.startMonth) return false;
    
    const startDate = new Date(student.startMonth);
    const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

    // El alumno empieza *antes* de que termine el mes pasado
    const startsBeforeOrDuringLastMonth = startDate <= lastDayLastMonth;
    // El alumno (no tiene baja O su baja es *después* de que empiece el mes pasado)
    const endsAfterOrDuringLastMonth = !endDate || endDate >= firstDayLastMonth;

    return startsBeforeOrDuringLastMonth && endsAfterOrDuringLastMonth;
}
// --- FIN DE CAMBIO ---

/**
 * Comprueba si un alumno estará activo *en cualquier momento* del PRÓXIMO mes.
 */
const isStudentActiveNextMonth = (student: Student): boolean => {
    if (!student.startMonth) return false;

    const startDate = new Date(student.startMonth);
    const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

    const startsBeforeOrDuringNextMonth = startDate <= lastDayNextMonth;
    const endsAfterOrDuringNextMonth = !endDate || endDate >= firstDayNextMonth;

    return startsBeforeOrDuringNextMonth && endsAfterOrDuringNextMonth;
}
// --- FIN LÓGICA DE FECHAS ---


const StudentList = ({ students, onSelectChild, onDeleteChild, onExport }: StudentListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  // --- INICIO DE CAMBIO: Añadido 'pasados' al estado ---
  const [activeSubTab, setActiveSubTab] = useState<'activos' | 'inactivos' | 'pasados' | 'proximos' | 'todos'>('activos');
  // --- FIN DE CAMBIO ---

  // Filtramos por búsqueda primero
  const filteredStudents = useMemo(() => {
    return students.filter(student =>
        `${student.name} ${student.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  // --- Listas Memoizadas para cada sub-pestaña ---

  // 1. "Activos" (Este Mes)
  const activeStudents = useMemo(() => {
      return filteredStudents
          .filter(isStudentActiveThisMonth)
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents]);

  // 2. "Inactivos" (Este Mes)
  const inactiveStudents = useMemo(() => {
      return filteredStudents
          .filter(student => !isStudentActiveThisMonth(student)) 
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents]);

  // --- INICIO DE CAMBIO: Nueva lista para "mes anterior" ---
  // 3. "Activos (mes anterior)"
  const lastMonthActiveStudents = useMemo(() => {
      return filteredStudents
          .filter(student => isStudentActiveLastMonth(student) && !isStudentActiveThisMonth(student))
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents]);
  // --- FIN DE CAMBIO ---

  // 4. "Activos (próximo mes)"
  const nextMonthStudents = useMemo(() => {
      return filteredStudents
          .filter(isStudentActiveNextMonth)
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents]);

  // 5. "Todos" (con estado de actividad de ESTE MES)
  const allStudentsWithStatus = useMemo(() => {
      return filteredStudents
          .map(student => ({
              ...student,
              isCurrentlyActive: isStudentActiveThisMonth(student)
          }))
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents]);

  
  // --- Renderizado de la lista basado en la pestaña activa ---
  const renderList = () => {
    let listToRender: (Student & { isCurrentlyActive?: boolean })[] = [];
    
    switch(activeSubTab) {
        case 'activos':
            listToRender = activeStudents;
            break;
        case 'inactivos':
            listToRender = inactiveStudents;
            break;
        // --- INICIO DE CAMBIO: Añadido 'case' para 'pasados' ---
        case 'pasados':
            listToRender = lastMonthActiveStudents;
            break;
        // --- FIN DE CAMBIO ---
        case 'proximos':
            listToRender = nextMonthStudents;
            break;
        case 'todos':
            listToRender = allStudentsWithStatus;
            break;
    }

    return listToRender.map(child => (
        <div key={child.id} style={styles.listItem}>
            <div>
                <p style={styles.listItemName}>{child.name} {child.surname}</p>
                <p style={styles.listItemInfo}>
                    Titular: {child.accountHolderName || 'No especificado'}
                    {/* Mostramos fechas de alta/baja para dar contexto */}
                    {(activeSubTab === 'inactivos' || activeSubTab === 'pasados' || (activeSubTab === 'todos' && !child.isCurrentlyActive)) && (
                        <span style={{...styles.listItemInfo, marginLeft: '10px', color: '#dc3545'}}>
                            (Alta: {child.startMonth || 'N/A'} {child.plannedEndMonth ? `- Baja: ${child.plannedEndMonth}` : ''})
                        </span>
                    )}
                </p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {/* Mostramos el indicador "Activo/Inactivo" solo en la pestaña "Todos" */}
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
        case 'inactivos': return inactiveStudents.length;
        // --- INICIO DE CAMBIO: Añadido 'case' para 'pasados' ---
        case 'pasados': return lastMonthActiveStudents.length;
        // --- FIN DE CAMBIO ---
        case 'proximos': return nextMonthStudents.length;
        case 'todos': return allStudentsWithStatus.length;
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

        {/* --- INICIO DE CAMBIO: Añadida nueva pestaña en orden --- */}
        <div style={styles.subTabContainer}>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'activos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('activos')}
            >
                Activos ({activeStudents.length})
            </button>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'inactivos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('inactivos')}
            >
                Inactivos ({inactiveStudents.length})
            </button>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'pasados' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('pasados')}
            >
                Activos (mes anterior) ({lastMonthActiveStudents.length})
            </button>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'proximos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('proximos')}
            >
                Activos (próximo mes) ({nextMonthStudents.length})
            </button>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'todos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('todos')}
            >
                Todos ({allStudentsWithStatus.length})
            </button>
        </div>
        {/* --- FIN DE CAMBIO --- */}
        
        <div style={styles.listContainer}>
            {renderList()}
        </div>
    </div>
  );
};

export default StudentList;