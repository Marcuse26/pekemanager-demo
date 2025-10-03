// Contenido para: src/components/tabs/Help.tsx
import { styles } from '../../styles';

const Help = () => {
    return (
        <div style={{...styles.card, fontFamily: 'system-ui, sans-serif', lineHeight: '1.6', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto'}}>
            <h2 style={styles.cardTitle}>Manual de Usuario de PekeManager</h2>

            <h3 style={{...styles.modalSectionTitle, marginTop: '30px', fontSize: '18px'}}>1. Introducción</h3>
            <p>¡Bienvenido/a a PekeManager! Este manual es una guía completa para usar la aplicación de gestión del centro infantil "mi pequeño recreo".</p>

            <h3 style={{...styles.modalSectionTitle, marginTop: '30px', fontSize: '18px'}}>2. Primeros Pasos: Acceso y Sesión</h3>
            <h4>2.1. Acceso a la Aplicación</h4>
            <p>Puedes acceder a PekeManager desde cualquier navegador web moderno (como Google Chrome, Firefox, o Safari) a través de la URL proporcionada.</p>
            <h4>2.2. Inicio de Sesión (Login)</h4>
            <p>Al acceder, verás la pantalla de inicio de sesión. Haz clic en tu perfil para seleccionarlo, introduce la contraseña que te ha sido asignada y pulsa "Entrar". Si la olvidas, contacta con el administrador.</p>
            <h4>2.3. Sesión y Cierre de Sesión</h4>
            <p>Tu sesión se mantendrá activa aunque refresques la página. Para salir de forma segura, especialmente en ordenadores compartidos, pulsa el botón rojo "Cerrar Sesión" en la esquina superior derecha.</p>

            <h3 style={{...styles.modalSectionTitle, marginTop: '30px', fontSize: '18px'}}>3. Explorando la Interfaz Principal</h3>
            <p>La interfaz se divide en tres áreas: la barra lateral de navegación a la izquierda, la cabecera superior y el área de contenido principal.</p>
            <h4>3.1. Barra Lateral de Navegación (Menú)</h4>
            <p>Es tu centro de navegación. Contiene enlaces a todas las secciones. Algunas opciones pueden no ser visibles dependiendo de los permisos de tu perfil.</p>
            <ul>
                <li><b>General:</b> Panel de Control, Nueva Inscripción, Alumnos, Asistencia, Calendario.</li>
                <li><b>Administración:</b> Facturación, Penalizaciones.</li>
                <li><b>Personal y Gestión:</b> Control Horario, Ayuda, y otras opciones administrativas.</li>
            </ul>
            <h4>3.2. Cabecera (Header)</h4>
            <p>Muestra el título de la sección actual y el botón para cerrar sesión.</p>
            <h4>3.3. Área de Contenido Principal</h4>
            <p>Es donde interactúas con la información y herramientas de cada sección.</p>

            <h3 style={{...styles.modalSectionTitle, marginTop: '30px', fontSize: '18px'}}>4. Guía Detallada de las Secciones</h3>

            <h4>4.1. Panel de Control</h4>
            <p>Ofrece un resumen visual del estado del centro con estadísticas clave: alumnos presentes, facturación estimada del mes y próximos cumpleaños, además de gráficos de asistencia, ocupación por horario y métodos de pago.</p>

            <h4>4.2. Nueva Inscripción</h4>
            <p>Formulario para dar de alta a nuevos alumnos. Campos como el nombre, apellidos, fecha de nacimiento, fecha de alta, teléfono, horario y método de pago son obligatorios.</p>

            <h4>4.3. Alumnos</h4>
            <p>Permite visualizar y gestionar la información de los alumnos. Puedes buscar por nombre y filtrar la lista por diferentes estados:</p>
            <ul>
                <li><b>Activos:</b> Alumnos inscritos en el mes actual.</li>
                <li><b>Inactivos:</b> Alumnos no inscritos en el mes actual.</li>
                <li><b>Activos (mes anterior):</b> Bajas recientes.</li>
                <li><b>Activos (próximo mes):</b> Futuras incorporaciones.</li>
                <li><b>Todos:</b> La lista completa con su estado actual.</li>
            </ul>
            <p>Desde aquí puedes "Ver Ficha" para más detalles o eliminar un alumno (con confirmación).</p>

            <h4>4.4. Ficha Detallada del Alumno (Ventana Modal)</h4>
            <p>Al hacer clic en "Ver Ficha", se abre una ventana con toda la información. Puedes pulsar "Editar Ficha" para modificar datos. Esta vista también permite:</p>
            <ul>
                <li>Adjuntar documentos.</li>
                <li>Ver el historial de modificaciones.</li>
                <li>Generar facturas en PDF (del mes actual, siguiente o pasados).</li>
                <li>Duplicar la ficha de un alumno inactivo para facilitar su re-inscripción.</li>
            </ul>

            <h4>4.5. Asistencia</h4>
            <p>Para el control diario de entradas y salidas. Al registrar una hora de salida posterior a la del horario contratado, el sistema genera automáticamente una penalización por retraso.</p>

            <h4>4.6. Calendario</h4>
            <p>Una vista mensual que muestra la afluencia de alumnos por día, con un código de colores para interpretar la ocupación rápidamente.</p>

            <h4>4.7. Facturación</h4>
            <p>Permite la generación masiva de facturas en PDF, filtrando por alumnos activos o inactivos de meses anteriores o posteriores.</p>

            <h4>4.8. Penalizaciones</h4>
            <p>Aquí se listan todos los cargos adicionales, principalmente por retrasos. Se pueden editar o eliminar si es necesario.</p>

            <h4>4.9. Control Horario</h4>
            <p>Pantalla personal para que cada empleado registre el inicio ("Registrar ENTRADA") y el fin ("Registrar SALIDA") de su jornada laboral. Solo se puede fichar una vez por día.</p>
            
            <br/>
            <p><i>Este manual se irá actualizando a medida que se añadan nuevas funcionalidades a PekeManager.</i></p>
            <p><b>Última actualización:</b> 03 de Octubre de 2025</p>

        </div>
    );
};

export default Help;