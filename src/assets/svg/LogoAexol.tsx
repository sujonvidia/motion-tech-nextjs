interface SvgProps {
    width?: number;
    height?: number;
}

export const LogoAexol: React.FC<SvgProps> = ({ height, width }) => (
    <img
        src="/images/aexol_full_logo.png?v=20260223"
        alt="Motion Marts"
        width={width || 80}
        height={height || 30}
        style={{ display: 'block', objectFit: 'contain' }}
    />
);
