// Contenido para: src/components/tabs/Dashboard.tsx
import { useMemo } from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import { UserCheck, DollarSign, Cake } from 'lucide-react';
import { styles } from '../../styles';
import { useAppContext } from '../../context/AppContext';
import ChartComponent from '../common/ChartComponent';
import webeaLogo from '../../assets/webea-logo.jpg';

const Dashboard = () => {
    const { students, attendance, invoices, schedules, config } = useAppContext();

    const { activeStudents, presentToday, monthlyBilling, upcomingBirthdays, weeklyAttendanceData } = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        lastDayOfMonth.setHours(23, 59, 59, 999);

        const activeStudents = students.filter(student => {
            if (!student.startMonth) return false;
            const startDate = new Date(student.startMonth);
            const endDate = student.plannedEndMonth ? new Date(student.plannedEndMonth) : null;
            return startDate <= lastDayOfMonth && (!endDate || endDate >= firstDayOfMonth);
        });
        
        const todayStr = today.toISOString().split('T')[0];
        const presentTodayCount = new Set(attendance.filter(a => a.date === todayStr).map(a => a.childId)).size;

        // --- INICIO DE CAMBIO: Cálculo de facturación basado en cuotas de alumnos activos ---
        const monthlyBillingTotal = activeStudents.reduce((sum, student) => {
            const schedule = schedules.find(s => s.id === student.schedule);
            const baseFee = schedule ? schedule.price : 0;
            const extendedFee = student.extendedSchedule ? 30 : 0;
            return sum + baseFee + extendedFee;
        }, 0);
        // --- FIN DE CAMBIO ---

        const upcomingBirthdaysList = activeStudents.filter(s => {
            const birthDate = new Date(s.birthDate);
            if (isNaN(birthDate.getTime())) return false;
            const todayDate = new Date(todayStr);
            todayDate.setHours(0,0,0,0);
            const nextMonth = new Date(todayDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            let birthdayThisYear = new Date(s.birthDate);
            birthdayThisYear.setFullYear(today.getFullYear());
            birthdayThisYear.setHours(12,0,0,0);

            if (birthdayThisYear < todayDate) {
                 birthdayThisYear.setFullYear(today.getFullYear() + 1);
            }
            
            return birthdayThisYear >= todayDate && birthdayThisYear < nextMonth;
        });

        const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
        const attendanceCounts = [0, 0, 0, 0, 0];
        let dateCursor = new Date();
        let daysChecked = 0;

        while (daysChecked < 5 && dateCursor > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
            const dayOfWeek = dateCursor.getDay(); // 0=Dom, 1=Lun,...
            if (dayOfWeek > 0 && dayOfWeek < 6) { // Si es de Lunes a Viernes
                const dateStr = dateCursor.toISOString().split('T')[0];
                const count = new Set(attendance.filter(a => a.date === dateStr).map(a => a.childId)).size;
                attendanceCounts[4 - daysChecked] = count;
                daysChecked++;
            }
            dateCursor.setDate(dateCursor.getDate() - 1);
        }

        return {
            activeStudents,
            presentToday: presentTodayCount,
            monthlyBilling: monthlyBillingTotal,
            upcomingBirthdays: upcomingBirthdaysList,
            weeklyAttendanceData: { labels: weekDays, data: attendanceCounts }
        };
    }, [students, attendance, schedules]);

    const attendanceChartData: ChartData<'bar'> = { labels: weeklyAttendanceData.labels, datasets: [{ label: 'Asistencia Semanal', data: weeklyAttendanceData.data, backgroundColor: 'rgba(0, 123, 255, 0.5)', borderColor: '#007bff', borderWidth: 1, borderRadius: 4 }] };
    
    const scheduleCounts = activeStudents.reduce((acc, child) => { acc[child.schedule] = (acc[child.schedule] || 0) + 1; return acc; }, {} as Record<string, number>);
    const scheduleLabels = schedules.map(s => s.name);
    const scheduleData = schedules.map(s => scheduleCounts[s.id] || 0);
    const distinctColors = ['#E6194B', '#3CB44B', '#F58231', '#4363D8', '#FFE119', '#911EB4', '#F032E6', '#42D4F4', '#FABEBE', '#469990', '#DBF876', '#BCF60C', '#FFD8B1', '#000075', '#A9A9A9', '#800000', '#AAFFC3', '#808000'];
    const occupancyChartData: ChartData<'doughnut'> = { labels: scheduleLabels, datasets: [{ label: 'Ocupación', data: scheduleData, backgroundColor: distinctColors.slice(0, schedules.length), borderWidth: 0 }] };

    const paymentMethodCounts = activeStudents.reduce((acc, student) => {
        const method = student.paymentMethod || 'No especificado';
        if (method && method.toLowerCase() !== 'efectivo') { acc[method] = (acc[method] || 0) + 1; }
        return acc;
    }, {} as Record<string, number>);
    const paymentChartData: ChartData<'doughnut'> = { labels: Object.keys(paymentMethodCounts), datasets: [{ label: 'Método de Pago', data: Object.values(paymentMethodCounts), backgroundColor: ['#28a745', '#ffc107', '#007bff', '#6f42c1'], borderWidth: 0 }] };
    
    const attendanceChartOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                suggestedMax: 10,
                ticks: {
                    stepSize: 1, 
                },
            },
        },
    };
    
    const doughnutOptions: ChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 10 }}}}};
    const paymentChartOptions: ChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 20 }}}};

    return (
        <div>
            <div style={styles.dashboardGrid}>
                <div style={styles.statCard}><UserCheck size={28} style={{color: '#28a745'}}/><div><p style={styles.statCardText}>Alumnos Hoy</p><span style={styles.statCardNumber}>{presentToday} / {activeStudents.length}</span></div></div>
                <div style={styles.statCard}><DollarSign size={28} style={{color: '#007bff'}}/><div><p style={styles.statCardText}>Facturación del Mes</p><span style={styles.statCardNumber}>{monthlyBilling.toFixed(2)}{config.currency}</span></div></div>
                <div style={styles.statCard}><Cake size={28} style={{color: '#ffc107'}}/><div><p style={styles.statCardText}>Próximos Cumpleaños</p><span style={styles.statCardNumber}>{upcomingBirthdays.length}</span></div></div>
            </div>

            <div style={{...styles.grid, gridTemplateColumns: '1fr 1.5fr 1fr', marginTop: '30px', alignItems: 'start'}}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Asistencia Última Semana</h3>
                    <ChartComponent type="bar" data={attendanceChartData} options={attendanceChartOptions} />
                </div>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Ocupación por Horario</h3>
                    <ChartComponent type="doughnut" data={occupancyChartData} options={doughnutOptions} />
                </div>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Métodos de Pago</h3>
                    <ChartComponent type="doughnut" data={paymentChartData} options={paymentChartOptions} />
                </div>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '30px' }}>
                <img src={webeaLogo} alt="Logo Webea" style={{ width: '150px' }} />
                <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>Desarrollado por Webea</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}><span style={{fontWeight: '500'}}>Soporte:</span> webea.oficial@gmail.com</p>
            </div>
        </div>
    );
};
export default Dashboard;