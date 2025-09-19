export const MiPequenoRecreoLogo = ({ width = 150, className = '' }: { width?: number; className?: string }) => (
    <div style={{ fontFamily: "'Dancing Script', cursive", color: '#c55a33', fontSize: `${width / 5}px`, textAlign: 'center' }} className={className}>
        mi pequeño recreo
    </div>
);

export const PekemanagerLogo = ({ size = 24 }: { size?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', fontFamily: "'Arial Black', Gadget, sans-serif", fontSize: `${size}px`, color: '#212529' }}>
        <div style={{ position: 'relative', marginRight: '5px' }}>
            <span style={{ fontSize: `${size * 1.5}px`, color: '#212529' }}>P</span>
            <div style={{ position: 'absolute', top: `${size * 0.3}px`, left: `${size * 0.9}px`, width: 0, height: 0, borderLeft: `${size * 0.5}px solid transparent`, borderRight: `${size * 0.5}px solid transparent`, borderBottom: `${size * 0.8}px solid #f39c12` }}></div>
        </div>
        <span style={{ fontStyle: 'italic', letterSpacing: '-1px' }}>EKEMANAGER</span>
    </div>
);