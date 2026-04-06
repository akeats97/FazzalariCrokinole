export default function Tricolore({ thick = false }) {
  const h = thick ? 'h-2' : 'h-1';
  return (
    <div className={`flex w-full ${h}`}>
      <div className={`flex-1 bg-forest`} />
      <div className={`flex-1 bg-cream border-y border-ink/5`} />
      <div className={`flex-1 bg-rosso`} />
    </div>
  );
}
