// Contenido COMPLETO para: src/components/LoginScreen.tsx
import { useState } from 'react'; 
import { LogIn } from 'lucide-react'; 
import { PekemanagerLogo } from './common/Logos';
import { styles } from '../styles';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

// --- INICIO DE CAMBIOS: Lista de usuarios actualizada ---
const userProfiles = [
    // Usuario Principal (ex-Gonzalo) con nueva contraseña
    { id: 'Usuario Principal', displayName: 'Usuario Principal', password: 'Webeademo1', avatarInitial: 'P' },
    // Nuevo perfil de Trabajador sin contraseña (acceso rápido)
    { id: 'Trabajador', displayName: 'Trabajador', password: '', avatarInitial: 'T' },
];
// --- FIN DE CAMBIOS ---

// Estilo para el texto dentro del avatar
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

    // Si la contraseña es vacía (perfil de "Trabajador"), el login es inmediato.
    if (expectedPassword === '') {
        onLogin(selectedUser);
        return;
    }
    
    if (expectedPassword && password === expectedPassword) {
      onLogin(selectedUser); 
    } else {
      setError('Contraseña incorrecta');
      setPassword('');
    }
  };

  const handleUserSelect = (userId: string) => { 
      // Si el perfil seleccionado es "Trabajador" (contraseña vacía), loguear inmediatamente
      const profile = userProfiles.find(p => p.id === userId);
      if (profile?.password === '') {
          onLogin(userId);
      } else {
          setSelectedUser(userId);
          setError('');
      }
  };

  const handleSwitchUser = () => {
      setSelectedUser(null);
      setPassword('');
      setError('');
  };

  const selectedProfile = userProfiles.find(p => p.id === selectedUser);
  const adminProfile = userProfiles.find(p => p.id === 'Usuario Principal');
  const workerProfile = userProfiles.find(p => p.id === 'Trabajador');

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox} className="loginBox"> {/* Ancho de 540px (de styles.ts) */}
        <PekemanagerLogo size={32} />
        
        {/* --- INICIO DE CAMBIO: Texto de Demo bajo el logo --- */}
        <div style={{ fontSize: '14px', color: '#dc3545', fontWeight: '600', marginBottom: '30px', marginTop: '10px' }}>
            PROYECTO DEMO / BASE DE DATOS NUEVA
        </div>
        {/* --- FIN DE CAMBIO --- */}
        
        {!selectedUser ? (
            <>
                <p style={styles.loginSubtitle}>¿Quién eres?</p>
                
                <div style={{...styles.userSelectionContainer, flexDirection: 'column', alignItems: 'center'}}>
                    
                    {/* Fila 1: Usuario Principal */}
                    {adminProfile && (
                        <div key={adminProfile.id} style={styles.userProfile} onClick={() => handleUserSelect(adminProfile.id)}>
                            <div style={styles.userAvatar}>
                                <span style={avatarTextStyle}>{adminProfile.avatarInitial}</span>
                            </div>
                            <span style={styles.userName}>{adminProfile.displayName}</span>
                        </div>
                    )}

                    {/* Fila 2: Trabajador (si existe) */}
                    <div style={{display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap'}}>
                        {workerProfile && ( 
                            <div key={workerProfile.id} style={styles.userProfile} onClick={() => handleUserSelect(workerProfile.id)}>
                                <div style={styles.userAvatar}>
                                    <span style={avatarTextStyle}>{workerProfile.avatarInitial}</span>
                                </div>
                                <span style={styles.userName}>{workerProfile.displayName}</span>
                            </div>
                        )}
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