// Contenido para: src/components/tabs/Dashboard.tsx
import type { ChartData, ChartOptions } from 'chart.js';
import { UserCheck, DollarSign, Cake } from 'lucide-react';
import { styles } from '../../styles';
import type { Student, Attendance, Invoice, Schedule, Config } from '../../types';
import ChartComponent from '../common/ChartComponent';
import webeaLogo from '../../assets/webea-logo.jpg'; 

interface DashboardProps {
    students: Student[];
    attendance: Attendance[];
    invoices: Invoice[];
    schedules: Schedule[];
    config: Config;
}

const Dashboard = ({ students, attendance, invoices, schedules, config }: DashboardProps) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const presentToday = attendance.filter(a => a.date === todayStr).length;
    const monthlyBilling = invoices.filter(inv => new Date(inv.date).getMonth() === new Date().getMonth()).reduce((sum, inv) => sum + inv.amount, 0);
    const upcomingBirthdays = students.filter(s => { const d = new Date(s.birthDate); d.setFullYear(new Date().getFullYear()); const diff = d.getTime() - new Date().getTime(); return diff > 0 && diff < 2.6e9; });
    
    // Gráfica de Asistencia
    const attendanceChartData: ChartData<'bar'> = { labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], datasets: [{ label: 'Asistencia Semanal', data: [1, 2, 3, 2, 3], backgroundColor: 'rgba(0, 123, 255, 0.5)', borderColor: '#007bff', borderWidth: 1, borderRadius: 4 }] };
    
    // Gráfica de Ocupación
    const scheduleCounts = students.reduce((acc, child) => { acc[child.schedule] = (acc[child.schedule] || 0) + 1; return acc; }, {} as Record<string, number>);
    const scheduleLabels = schedules.map(s => s.name);
    const scheduleData = schedules.map(s => scheduleCounts[s.id] || 0);

    const distinctColors = [
        '#E6194B', // Cuota 315€ (Rojo)
        '#3CB44B', // Cuota 410€ (Verde)
        '#F58231', // Cuota 425€ (Naranja)
        '#4363D8', // Cuota 450€ (Azul)
        '#FFE119', // Cuota 460€ (Amarillo)
        '#911EB4', // Cuota 495€ (Púrpura)
        '#F032E6', // Cuota 545€ (Rosa)
        '#42D4F4', '#FABEBE', '#469990', '#DBF876', '#BCF60C',
        '#FFD8B1', '#000075', '#A9A9A9', '#800000', '#AAFFC3', '#808000', 
    ];

    const occupancyChartData: ChartData<'doughnut'> = { 
        labels: scheduleLabels, 
        datasets: [{ 
            label: 'Ocupación', 
            data: scheduleData, 
            backgroundColor: distinctColors.slice(0, schedules.length), 
            borderWidth: 0 
        }] 
    };

    // --- INICIO DE CAMBIO: Lógica del gráfico de Métodos de Pago ---
    // Se filtran los alumnos cuyo método de pago sea "Efectivo"
    const paymentMethodCounts = students.reduce((acc, student) => {
        const method = student.paymentMethod || 'No especificado';
        if (method && method.toLowerCase() !== 'efectivo') {
            acc[method] = (acc[method] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const paymentChartData: ChartData<'doughnut'> = {
        labels: Object.keys(paymentMethodCounts),
        datasets: [{
            label: 'Método de Pago',
            data: Object.values(paymentMethodCounts),
            // Se asegura de que haya suficientes colores para los métodos de pago restantes
            backgroundColor: ['#28a745', '#ffc107', '#007bff', '#6f42c1'], 
            borderWidth: 0
        }]
    };
    // --- FIN DE CAMBIO ---

    // Opciones para gráfico de Asistencia (sin leyenda)
    const chartOptions: ChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
    
    const occupancyChartOptions: ChartOptions = { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
            legend: { 
                display: true, 
                position: 'bottom', 
                labels: { 
                    boxWidth: 12, 
                    padding: 15,
                    font: {
                        size: 10
                    }
                } 
            } 
        } 
    };

    const paymentChartOptions: ChartOptions = { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
            legend: { 
                display: true, 
                position: 'bottom', 
                labels: { 
                    boxWidth: 12, 
                    padding: 20 
                } 
            } 
        } 
    };

    // Estilos para el footer de Webea (sin tarjeta)
    const webeaFooterContainer: React.CSSProperties = {
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '8px', 
        marginTop: '30px'
    };
    const webeaText: React.CSSProperties = { margin: 0, fontSize: '12px', color: '#6c757d' };

    return (
        <div>
            <div style={styles.dashboardGrid}>
                <div style={styles.statCard}><UserCheck size={28} style={{color: '#28a745'}}/><div><p style={styles.statCardText}>Alumnos Hoy</p><span style={styles.statCardNumber}>{presentToday} / {students.length}</span></div></div>
                <div style={styles.statCard}><DollarSign size={28} style={{color: '#007bff'}}/><div><p style={styles.statCardText}>Facturación del Mes</p><span style={styles.statCardNumber}>{monthlyBilling.toFixed(2)}{config.currency}</span></div></div>
                <div style={styles.statCard}><Cake size={28} style={{color: '#ffc107'}}/><div><p style={styles.statCardText}>Próximos Cumpleaños</p><span style={styles.statCardNumber}>{upcomingBirthdays.length}</span></div></div>
            </div>

            <div style={{...styles.grid, gridTemplateColumns: '1fr 1.5fr 1fr', marginTop: '30px', alignItems: 'start'}}>
                
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Asistencia Última Semana</h3>
                    <ChartComponent type="bar" data={attendanceChartData} options={chartOptions} />
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Ocupación por Horario</h3>
                    <ChartComponent type="doughnut" data={occupancyChartData} options={occupancyChartOptions} />
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Métodos de Pago</h3>
                    <ChartComponent type="doughnut" data={paymentChartData} options={paymentChartOptions} />
                </div>
            </div>

            <div style={webeaFooterContainer}>
                <img src={webeaLogo} alt="Logo Webea" style={{ width: '150px' }} />
                <p style={webeaText}>Desarrollado por Webea</p>
                <p style={webeaText}>
                    <span style={{fontWeight: '500'}}>Soporte:</span> webea.oficial@gmail.com
                </p>
            </div>
            
        </div>
    );
};

export default Dashboard;