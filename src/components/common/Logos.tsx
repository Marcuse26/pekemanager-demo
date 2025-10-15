export const MiPequenoRecreoLogo = ({ width = 150, className = '' }: { width?: number; className?: string }) => (
    <div style={{ fontFamily: "'Dancing Script', cursive", color: '#c55a33', fontSize: `${width / 5}px`, textAlign: 'center' }} className={className}>
        mi pequeño recreo
    </div>
);

export const PekemanagerLogo = ({ size = 24 }: { size?: number }) => (
    // Contenedor principal que permite posicionamiento relativo de "DEMO"
    <div style={{ display: 'flex', alignItems: 'center', fontFamily: "'Arial Black', Gadget, sans-serif", fontSize: `${size}px`, color: '#212529', position: 'relative' }}>
        
        {/* Estructura original del logo (P + Triángulo) */}
        <div style={{ position: 'relative', marginRight: '5px' }}>
            <span style={{ fontSize: `${size * 1.5}px`, color: '#212529' }}>P</span>
            <div style={{ position: 'absolute', top: `${size * 0.3}px`, left: `${size * 0.9}px`, width: 0, height: 0, borderLeft: `${size * 0.5}px solid transparent`, borderRight: `${size * 0.5}px solid transparent`, borderBottom: `${size * 0.8}px solid #f39c12` }}></div>
        </div>
        
        {/* Texto "EKEMANAGER" */}
        <span style={{ fontStyle: 'italic', letterSpacing: '-1px' }}>EKEMANAGER</span>
        
        {/* Texto "DEMO" en la esquina inferior izquierda (Nueva adición) */}
        <div style={{
            position: 'absolute',
            bottom: `${size * -0.5}px`, // Ajusta la posición vertical
            left: `${size * -0.5}px`,    // Ajusta la posición horizontal
            fontSize: `${size * 0.5}px`, // Tamaño más pequeño
            color: '#dc3545',            // Color llamativo (el rojo de error)
            fontWeight: '900',           // Negrita
            letterSpacing: '1px',
            opacity: 0.9,
            transform: 'rotate(-5deg)'   // Pequeña inclinación para hacerlo más "sello"
        }}>
            DEMO
        </div>
    </div>
);
