export interface CoupleNameProps {
  name: string;
}

/** Nombres o iniciales de la pareja con la "&" más pequeña para que resalten los nombres. */
export function CoupleName({ name }: CoupleNameProps) {
  const parts = name.split(" & ");
  if (parts.length < 2) return <>{name}</>;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-[0.2em] align-middle text-[0.5em] font-normal">&amp;</span>}
          {part}
        </span>
      ))}
    </>
  );
}
