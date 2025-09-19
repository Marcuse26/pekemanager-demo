// Contenido para: src/components/tabs/StudentList.tsx
import { useState, useMemo } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { styles } from '../../styles';
import type { Student } from '../../types';

// --- LÓGICA DE FECHAS ---
const today = new Date();
today.setHours(0, 0, 0, 0); // Normalizar a medianoche

// Rango del mes actual
const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

// Rango del mes que viene
const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const lastDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

/**
 * Comprueba si un alumno está activo en una fecha específica (hoy).
 */
const isStudentActiveOnDate = (student: Student, date: Date): boolean => {
    if (!student.startMonth) return false; // No puede estar activo si no tiene fecha de alta
    
    const startDate = new Date(student.startMonth);
    const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

    // Está activo si:
    // 1. Su alta es hoy o antes
    // 2. Y (no tiene fecha de baja O su fecha de baja es hoy o después)
    return startDate <= date && (!endDate || endDate >= date);
};

/**
 * Comprueba si un alumno está activo *en cualquier momento* de ESTE mes.
 * Su rango de fechas (alta-baja) se solapa con el rango (inicio-fin) de este mes.
 */
const isStudentActiveThisMonth = (student: Student): boolean => {
    if (!student.startMonth) return false;
    
    const startDate = new Date(student.startMonth);
    const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

    // El alumno empieza *antes* de que termine este mes
    const startsBeforeOrDuringMonth = startDate <= lastDayThisMonth;
    // El alumno (no tiene baja O su baja es *después* de que empiece este mes)
    const endsAfterOrDuringMonth = !endDate || endDate >= firstDayThisMonth;

    return startsBeforeOrDuringMonth && endsAfterOrDuringMonth;
}

// --- LÓGICA MODIFICADA ---
/**
 * Comprueba si un alumno estará activo *en cualquier momento* del PRÓXIMO mes.
 * (Incluye activos que continúan Y nuevos que empiezan)
 * Su rango de fechas (alta-baja) se solapa con el rango (inicio-fin) del próximo mes.
 */
const isStudentActiveNextMonth = (student: Student): boolean => {
    if (!student.startMonth) return false;

    const startDate = new Date(student.startMonth);
    const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;

    // El alumno empieza *antes* de que TERMINE el próximo mes
    const startsBeforeOrDuringNextMonth = startDate <= lastDayNextMonth;
    
    // El alumno (no tiene baja O su baja es *después* de que EMPIECE el próximo mes)
    // Esto cumple tu petición: "q no tengan fecha de baja o una fecha de baja correspondiente a uno o varios meses próximos"
    const endsAfterOrDuringNextMonth = !endDate || endDate >= firstDayNextMonth;

    return startsBeforeOrDuringNextMonth && endsAfterOrDuringNextMonth;
}
// --- FIN LÓGICA MODIFICADA ---


const StudentList = ({ students, onSelectChild, onDeleteChild, onExport }: StudentListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  // 'proximos' ahora significa "activos el próximo mes"
  const [activeSubTab, setActiveSubTab] = useState<'activos' | 'todos' | 'proximos'>('activos');

  // Filtramos por búsqueda primero
  const filteredStudents = useMemo(() => {
    return students.filter(student =>
        `${student.name} ${student.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  // --- Listas Memoizadas para cada sub-pestaña ---

  // 1. Lista "Activos (Este Mes)"
  const activeStudents = useMemo(() => {
      return filteredStudents
          .filter(isStudentActiveThisMonth)
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents]);

  // 2. Lista "Historial (Todos)" (con estado de actividad de HOY)
  const allStudentsWithStatus = useMemo(() => {
      return filteredStudents
          .map(student => ({
              ...student,
              isCurrentlyActive: isStudentActiveOnDate(student, today) // Usa la función de fecha específica
          }))
          .sort((a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`));
  }, [filteredStudents, today]); // Añadido today como dependencia

  // 3. Lista "Activos (Próximo Mes)"
  const nextMonthStudents = useMemo(() => {
      return filteredStudents
          .filter(isStudentActiveNextMonth) // Usa la nueva lógica
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
                    {/* Mostramos fechas de alta/baja solo en la vista de historial si está inactivo */}
                    {activeSubTab === 'todos' && child.isCurrentlyActive === false && (
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

        {/* --- CONTENEDOR DE SUB-PESTAÑAS (Etiquetas actualizadas) --- */}
        <div style={styles.subTabContainer}>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'activos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('activos')}
            >
                Activos (Este Mes) ({activeStudents.length})
            </button>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'proximos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('proximos')}
            >
                Activos (Próximo Mes) ({nextMonthStudents.length})
            </button>
            <button 
                style={{...styles.subTabButton, ...(activeSubTab === 'todos' ? styles.subTabButtonActive : {})}}
                onClick={() => setActiveSubTab('todos')}
            >
                Historial (Todos) ({allStudentsWithStatus.length})
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