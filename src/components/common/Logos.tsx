export const MiPequenoRecreoLogo = ({ width = 150, className = '' }: { width?: number; className?: string }) => (
    // Nuevo componente de logo simple para la demo
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#007bff', fontSize: `${width / 5}px`, textAlign: 'center', fontWeight: '900', letterSpacing: '1px' }} className={className}>
        DEMO
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
        
        {/* Texto "DEMO" integrado */}
        <div style={{
            position: 'absolute',
            bottom: `${size * -0.2}px`, 
            left: `${size * 0.2}px`,    
            fontSize: `${size * 0.5}px`, 
            color: '#f39c12',            
            fontWeight: '900',           
            letterSpacing: '1px',
            opacity: 0.8,
        }}>
            DEMO
        </div>
    </div>
);