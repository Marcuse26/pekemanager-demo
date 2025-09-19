// Contenido COMPLETO para: src/components/LoginScreen.tsx
import { useState } from 'react'; 
import { LogIn } from 'lucide-react'; 
import { PekemanagerLogo } from './common/Logos';
import { styles } from '../styles';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

const userProfiles = [
    { id: 'gonzalo', displayName: 'Gonzalo', password: 'gonzalo123', avatarInitial: 'G' },
    { id: 'trabajador1', displayName: 'Trabajador 1', password: 'pass1', avatarInitial: '1' },
    { id: 'trabajador2', displayName: 'Trabajador 2', password: 'pass2', avatarInitial: '2' },
    { id: 'trabajador3', displayName: 'Trabajador 3', password: 'pass3', avatarInitial: '3' },
];

// Estilo para el texto dentro del avatar (G, 1, 2, 3)
const avatarTextStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#495057' 
};


const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const userProfile = userProfiles.find(p => p.id === selectedUser);
    const expectedPassword = userProfile?.password;

    if (expectedPassword && password === expectedPassword) {
      onLogin(selectedUser); 
    } else {
      setError('Contraseña incorrecta');
      setPassword('');
    }
  };

  const handleUserSelect = (userId: string) => { 
      setSelectedUser(userId);
      setError('');
  };

  const handleSwitchUser = () => {
      setSelectedUser(null);
      setPassword('');
      setError('');
  };

  // Buscamos el perfil completo del usuario seleccionado
  const selectedProfile = userProfiles.find(p => p.id === selectedUser);

  const gonzaloProfile = userProfiles.find(p => p.id === 'gonzalo');
  const workerProfiles = userProfiles.filter(p => p.id !== 'gonzalo');

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox}>
        <PekemanagerLogo size={32} />
        
        {!selectedUser ? (
            <>
                <p style={styles.loginSubtitle}>¿Quién eres?</p>
                
                {/* Contenedor principal ahora es vertical (hereda el 'gap' de 20px de styles.ts) */}
                <div style={{...styles.userSelectionContainer, flexDirection: 'column', alignItems: 'center'}}>
                    
                    {/* Fila 1: Renderizar a Gonzalo (centrado arriba) */}
                    {gonzaloProfile && (
                        <div key={gonzaloProfile.id} style={styles.userProfile} onClick={() => handleUserSelect(gonzaloProfile.id)}>
                            <div style={styles.userAvatar}>
                                <span style={avatarTextStyle}>{gonzaloProfile.avatarInitial}</span>
                            </div>
                            <span style={styles.userName}>{gonzaloProfile.displayName}</span>
                        </div>
                    )}

                    {/* --- CORRECCIÓN: Eliminado el 'marginTop: 20px' de aquí para reducir el espacio --- */}
                    <div style={{display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap'}}>
                        {workerProfiles.map(profile => ( 
                            <div key={profile.id} style={styles.userProfile} onClick={() => handleUserSelect(profile.id)}>
                                <div style={styles.userAvatar}>
                                    <span style={avatarTextStyle}>{profile.avatarInitial}</span>
                                </div>
                                <span style={styles.userName}>{profile.displayName}</span>
                            </div>
                        ))}
                    </div>

                </div>
            </>
        ) : (
            <>
                <div style={styles.selectedUserProfile}>
                    <div style={styles.userAvatar}>
                        <span style={avatarTextStyle}>{selectedProfile?.avatarInitial}</span>
                    </div>
                    <span style={styles.userName}>{selectedProfile?.displayName}</span>
                </div>
                <form onSubmit={handleLogin} style={{width: '80%'}}>
                    <input 
                        type="password" 
                        placeholder="Contraseña" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        style={styles.loginInput} 
                        autoFocus
                    />
                    {error && <p style={styles.loginError}>{error}</p>}
                    <button type="submit" style={styles.loginButton}><LogIn size={18} style={{ marginRight: '8px' }} />Entrar</button>
                </form>
                <button onClick={handleSwitchUser} style={styles.switchUserButton}>Cambiar de usuario</button>
            </>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;