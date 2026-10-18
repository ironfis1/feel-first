// The three scale references, drawn in code in inches [Res #12, Gap G7, Gap G30]. Each viewBox is the object's true
// width and its height in config, so the Wall can place it at true scale from pixels per inch alone.

import { wallSceneHeightIn, wallSceneReferenceWidthIn, type WallScene } from "@/config/feel";

function Sofa() {
  return (
    <>
      <rect x="5" y="2" width="74" height="20" rx="3" />
      <rect x="6" y="18" width="72" height="13" rx="2" />
      <rect x="10" y="17" width="31.5" height="6" rx="2" data-part="cushion" />
      <rect x="42.5" y="17" width="31.5" height="6" rx="2" data-part="cushion" />
      <rect x="0" y="12" width="10" height="19" rx="4" />
      <rect x="74" y="12" width="10" height="19" rx="4" />
      <rect x="7" y="31" width="2.5" height="3" />
      <rect x="74.5" y="31" width="2.5" height="3" />
    </>
  );
}

function Bed() {
  return (
    <>
      <rect x="1" y="0" width="58" height="30" rx="4" />
      <rect x="6" y="16" width="20" height="8" rx="3" data-part="cushion" />
      <rect x="34" y="16" width="20" height="8" rx="3" data-part="cushion" />
      <rect x="0" y="23" width="60" height="13" rx="2" data-part="cushion" />
      <rect x="0" y="36" width="60" height="5" />
      <rect x="2" y="41" width="3" height="3" />
      <rect x="55" y="41" width="3" height="3" />
    </>
  );
}

function Desk() {
  return (
    <>
      <rect x="0" y="0" width="60" height="2" />
      <rect x="2" y="2" width="2" height="28" />
      <rect x="56" y="2" width="2" height="28" />
      <rect x="38" y="2" width="18" height="7" data-part="cushion" />
      <rect x="6.5" y="-11" width="1" height="11" />
      <rect x="3" y="-14" width="8" height="4" rx="1" data-part="cushion" />
    </>
  );
}

const shapes: Record<WallScene, () => React.JSX.Element> = { sofa: Sofa, bed: Bed, desk: Desk };

/** The scene's furniture at true scale, standing on the floor at the center of the wall. */
export function SceneObject({ scene, ppi, className }: { scene: WallScene; ppi: number; className?: string }) {
  const w = wallSceneReferenceWidthIn[scene];
  const h = wallSceneHeightIn[scene];
  const Shape = shapes[scene];
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} width={w * ppi} height={h * ppi} overflow="visible" aria-hidden>
      <Shape />
    </svg>
  );
}
