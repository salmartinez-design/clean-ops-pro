import { Link } from "wouter";

export default function NotFound() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0D0D', gap: '16px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '72px', color: '#E8E0D0', margin: 0, lineHeight: 1 }}>404</h1>
      <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 300, fontSize: '14px', color: '#888780', margin: 0 }}>This page could not be found.</p>
      <Link href="/dashboard">
        <button style={{ marginTop: '8px', padding: '8px 20px', backgroundColor: 'var(--tenant-color)', color: '#0D0D0D', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Mono', monospace", border: 'none', cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </Link>
    </div>
  );
}
