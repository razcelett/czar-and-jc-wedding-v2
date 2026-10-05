import Wave from './Wave';

export default function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="label" style={style}>
      <Wave />
      <span>{children}</span>
      <Wave />
    </div>
  );
}
