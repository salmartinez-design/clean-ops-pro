/**
 * [AI.7.5] Legend popover — explains the 7 canonical job visual
 * statuses. Renders as a popover on desktop (anchored to the Legend
 * button), bottom sheet on mobile (swipe-to-close gesture optional;
 * tap outside / ESC always closes). Tile previews mirror the actual
 * card styling so the user sees what to expect on the dispatch board.
 */
import { useEffect, useRef } from "react";
import { X, Check, AlertTriangle } from "lucide-react";
import { JobVisualStatus, STATUS_VISUALS, ensureJobStatusStyles } from "@/lib/job-status";

const FF = "'Plus Jakarta Sans', sans-serif";

const STATUS_ORDER: JobVisualStatus[] = [
  "scheduled",
  "active",
  "completed",
  "late_clockin",
  "no_show",
  "cancelled",
  "unassigned",
];

function ExampleTile({ status }: { status: JobVisualStatus }) {
  const v = STATUS_VISUALS[status];
  const stripeStyle: React.CSSProperties = v.stripe
    ? { width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: v.stripe, flexShrink: 0 }
    : { width: 0, flexShrink: 0 };
  return (
    <div style={{
      display: "flex", alignItems: "stretch", gap: 6, width: 96, height: 44,
      borderRadius: 6, padding: 4, position: "relative",
      backgroundColor: v.swatch, opacity: v.bodyOpacity,
      filter: v.desaturate ? "grayscale(1)" : "none",
      border: v.borderOverride ? `1.5px solid ${v.borderOverride}` : "1px solid rgba(0,0,0,0.08)",
      flexShrink: 0,
    }}>
      {v.stripe && <div className="qleno-active-stripe" style={stripeStyle} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden", color: "#1A1917" }}>
        <div style={{ fontSize: 10, fontWeight: 800, lineHeight: 1.1, textDecoration: v.strikethrough ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Sample Client
        </div>
        <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.7, marginTop: 1 }}>9:00 AM</div>
      </div>
      {v.showCheckmark && (
        <div style={{ position: "absolute", top: 3, right: 3, width: 14, height: 14, borderRadius: "50%", backgroundColor: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={9} color="#FFFFFF" strokeWidth={3} />
        </div>
      )}
      {v.showNoShowBadge && (
        <div style={{ position: "absolute", top: 3, right: 3, fontSize: 8, fontWeight: 800, color: "#FFFFFF", backgroundColor: "#991B1B", padding: "1px 4px", borderRadius: 3 }}>
          NO SHOW
        </div>
      )}
    </div>
  );
}

export default function LegendPopover({ open, onClose, mobile, anchorRect }: {
  open: boolean;
  onClose: () => void;
  mobile: boolean;
  /** Desktop: pixel coords of the Legend button so the popover anchors below it. */
  anchorRect?: DOMRect | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureJobStatusStyles();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  const rows = STATUS_ORDER.map(s => {
    const v = STATUS_VISUALS[s];
    return (
      <div key={s} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderTop: "1px solid #F0EEE9" }}>
        <ExampleTile status={s} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1917" }}>{v.label}</div>
          <div style={{ fontSize: 11, color: "#6B6860", marginTop: 2, lineHeight: 1.4 }}>{v.description}</div>
        </div>
      </div>
    );
  });

  if (mobile) {
    // Bottom sheet
    return (
      <>
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 410 }} />
        <div ref={ref} style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 411,
          backgroundColor: "#FFFFFF", borderTopLeftRadius: 16, borderTopRightRadius: 16,
          padding: "16px 18px 24px", maxHeight: "80vh", overflowY: "auto", fontFamily: FF,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#D0CEC9" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1917" }}>Status legend</div>
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}>
              <X size={18} color="#6B6860" />
            </button>
          </div>
          {rows}
        </div>
      </>
    );
  }

  // Desktop popover anchored under button. Fallback to top-right if no anchor.
  const top = anchorRect ? anchorRect.bottom + 6 : 100;
  const right = anchorRect ? Math.max(8, window.innerWidth - anchorRect.right) : 16;
  return (
    <div ref={ref} style={{
      position: "fixed", top, right, zIndex: 411, width: 360,
      backgroundColor: "#FFFFFF", border: "1px solid #E5E2DC", borderRadius: 12,
      boxShadow: "0 12px 40px rgba(0,0,0,0.16)", padding: "12px 16px 14px",
      fontFamily: FF, maxHeight: "70vh", overflowY: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1917" }}>Status legend</div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2 }}>
          <X size={14} color="#6B6860" />
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#9E9B94", marginBottom: 6 }}>
        How job tiles appear on the dispatch board.
      </div>
      {rows}
    </div>
  );
}
