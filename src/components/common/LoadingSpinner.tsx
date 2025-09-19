import { styles } from '../../styles';

export const LoadingSpinner = () => (
    <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando datos...</p>
    </div>
);