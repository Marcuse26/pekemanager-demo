// Contenido para: src/components/tabs/StudentList.tsx
import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { styles } from '../../styles';
import type { Student } from '../../types';

interface StudentListProps {
    students: Student[];
    onSelectChild: (student: Student) => void;
    onDeleteChild: (id: string, name: string) => void;
    onExport: () => void;
}

const StudentList = ({ students, onSelectChild, onDeleteChild, onExport }: StudentListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredStudents = students.filter(student =>
    `${student.name} ${student.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStudents = [...filteredStudents].sort((a, b) => 
    `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)
  );

  return (
    <div style={styles.card}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h3 style={{...styles.cardTitle, margin: 0}}>Alumnos Inscritos ({sortedStudents.length})</h3>
            <div style={{display: 'flex', gap: '10px'}}>
                <input
                    type="text"
                    placeholder="Buscar alumno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{...styles.formInputSmall, width: '250px'}}
                />
                 <button onClick={onExport} style={{...styles.actionButton, backgroundColor: '#17a2b8'}}><Download size={16} style={{marginRight: '8px'}} />Exportar</button>
            </div>
        </div>
        <div style={styles.listContainer}>
            {sortedStudents.map(child => (
                <div key={child.id} style={styles.listItem}>
                    <div>
                        <p style={styles.listItemName}>{child.name} {child.surname}</p>
                        <p style={styles.listItemInfo}>Titular: {child.accountHolderName || 'No especificado'}</p>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <button onClick={() => onSelectChild(child)} style={styles.pillInfo}>Ver Ficha</button>
                        <button onClick={() => onDeleteChild(child.id, `${child.name} ${child.surname}`)} style={styles.deleteButton}><Trash2 size={14}/></button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default StudentList;