import { useEffect } from 'react';
import { styles } from '../../styles';

export const Notification = ({ message, onClose }: { message: string; onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);
    return <div style={styles.notification}>{message}</div>;
};