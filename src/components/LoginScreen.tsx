// Contenido COMPLETO para: src/components/LoginScreen.tsx
import { useState } from 'react'; 
import { LogIn } from 'lucide-react'; 
import { PekemanagerLogo } from './common/Logos';
import { styles } from '../styles';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

// --- CAMBIOS: Contraseñas eliminadas para el modo demo ---
const userProfiles = [
    // Usuario Principal: Contraseña vacía para acceso directo.
    { id: 'Usuario Principal', displayName: 'Usuario Principal', password: '', avatarInitial: 'P' },
    // Trabajador: Contraseña vacía para acceso directo.
    { id: 'Trabajador', displayName: 'Trabajador', password: '', avatarInitial: 'T' },
];
// --- Fin de cambios ---

// Estilo para el texto dentro del avatar
const avatarTextStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#495057' 
};


const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  // Ya no usamos el estado para la contraseña o el error, pero mantenemos selectedUser.
  const [selectedUser, setSelectedUser] = useState<string | null>(null); 
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplemente usamos el usuario seleccionado para el login, ya que no hay contraseña
    if (selectedUser) {
        onLogin(selectedUser);
    }
  };

  const handleUserSelect = (userId: string) => { 
      // En este modo demo, el login es directo al hacer clic.
      onLogin(userId);
  };

  const handleSwitchUser = () => {
      setSelectedUser(null);
  };

  const selectedProfile = userProfiles.find(p => p.id === selectedUser);
  const adminProfile = userProfiles.find(p => p.id === 'Usuario Principal');
  const workerProfile = userProfiles.find(p => p.id === 'Trabajador');

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox} className="loginBox"> {/* Ancho de 540px (de styles.ts) */}
        
        {/* Logo con la etiqueta DEMO integrada */}
        <PekemanagerLogo size={32} />
        
        {/* --- Indicación de modo DEMO y ausencia de contraseña --- */}
        <div style={{ fontSize: '14px', color: '#17a2b8', fontWeight: '500', marginBottom: '25px', marginTop: '10px' }}>
             Modo DEMO: No se requiere contraseña.
        </div>
        
        {!selectedUser ? (
            <>
                <p style={styles.loginSubtitle}>Selecciona tu perfil para acceder:</p>
                
                <div style={{...styles.userSelectionContainer, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'}}>
                    
                    {/* Usuario Principal */}
                    {adminProfile && (
                        <div key={adminProfile.id} style={styles.userProfile} onClick={() => handleUserSelect(adminProfile.id)}>
                            <div style={styles.userAvatar}>
                                <span style={avatarTextStyle}>{adminProfile.avatarInitial}</span>
                            </div>
                            <span style={styles.userName}>{adminProfile.displayName}</span>
                        </div>
                    )}

                    {/* Trabajador */}
                    {workerProfile && ( 
                        <div key={workerProfile.id} style={styles.userProfile} onClick={() => handleUserSelect(workerProfile.id)}>
                            <div style={styles.userAvatar}>
                                <span style={avatarTextStyle}>{workerProfile.avatarInitial}</span>
                            </div>
                            <span style={styles.userName}>{workerProfile.displayName}</span>
                        </div>
                    )}
                </div>
            </>
        ) : (
            // Esta sección se usaba para introducir la contraseña, ahora simplificamos la transición
            <>
                <div style={styles.selectedUserProfile}>
                    <div style={styles.userAvatar}>
                        <span style={avatarTextStyle}>{selectedProfile?.avatarInitial}</span>
                    </div>
                    <span style={styles.userName}>{selectedProfile?.displayName}</span>
                </div>
                {/* El formulario se mantiene solo para el botón de acceso, ya no tiene input de contraseña */}
                <form onSubmit={handleLogin} style={{width: '80%'}}>
                    <button type="submit" style={styles.loginButton}><LogIn size={18} style={{ marginRight: '8px' }} />Acceder al Dashboard</button>
                </form>
                <button onClick={handleSwitchUser} style={styles.switchUserButton}>Cambiar de perfil</button>
            </>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
