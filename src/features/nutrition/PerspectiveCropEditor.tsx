import { useState, type PointerEvent } from 'react';
import { DEFAULT_PERSPECTIVE_CORNERS, type NormalizedPoint, type PerspectiveCorners } from '../../application/media/image-processing';

type CornerName = keyof PerspectiveCorners;
const LABELS: Record<CornerName, string> = { topLeft: 'superior esquerdo', topRight: 'superior direito', bottomRight: 'inferior direito', bottomLeft: 'inferior esquerdo' };

export function PerspectiveCropEditor({ src, corners, onChange, onAutoDetect }: { src: string; corners: PerspectiveCorners; onChange: (corners: PerspectiveCorners) => void; onAutoDetect: () => void }) {
  const [active, setActive] = useState<CornerName>();
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!active) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const point: NormalizedPoint = { x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)), y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)) };
    onChange({ ...corners, [active]: point });
  }
  return <section className="perspective-editor" aria-label="Correção de perspectiva">
    <header><div><strong>Enquadre somente a tabela</strong><small>Arraste os quatro pontos até os cantos impressos.</small></div><div><button type="button" onClick={onAutoDetect}>Detectar</button><button type="button" onClick={() => onChange(DEFAULT_PERSPECTIVE_CORNERS)}>Redefinir</button></div></header>
    <div className="perspective-stage" onPointerMove={move} onPointerUp={() => setActive(undefined)} onPointerCancel={() => setActive(undefined)}>
      <img src={src} alt="Imagem para correção de perspectiva" draggable={false} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points={`${corners.topLeft.x * 100},${corners.topLeft.y * 100} ${corners.topRight.x * 100},${corners.topRight.y * 100} ${corners.bottomRight.x * 100},${corners.bottomRight.y * 100} ${corners.bottomLeft.x * 100},${corners.bottomLeft.y * 100}`} /></svg>
      {(Object.keys(corners) as CornerName[]).map((name) => <button key={name} className="perspective-handle" style={{ left: `${corners[name].x * 100}%`, top: `${corners[name].y * 100}%` }} type="button" aria-label={`Canto ${LABELS[name]}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setActive(name); }} />)}
    </div>
  </section>;
}
