import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetMyCompany, useUpdateMyCompany } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { applyTenantColor } from "@/lib/tenant-brand";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ImageIcon } from "lucide-react";

type Tab = 'general' | 'branding' | 'integrations' | 'payroll' | 'notifications';

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'branding', label: 'Branding' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'payroll', label: 'Payroll Options' },
];

export default function CompanyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('branding');

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '42px', color: '#1A1917', margin: 0, lineHeight: 1.1 }}>Company Settings</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: '13px', color: '#6B7280', marginTop: '6px' }}>Manage your company profile, branding, and integrations.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #E5E2DC', paddingBottom: '0' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: activeTab === tab.id ? 500 : 400,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? 'var(--brand)' : '#6B7280',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--brand)' : 'transparent'}`,
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'branding' && <BrandingTab />}
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'integrations' && <PlaceholderTab title="Integrations" desc="Connect QuickBooks, Stripe, and other services." />}
        {activeTab === 'payroll' && <PlaceholderTab title="Payroll Options" desc="Configure pay cadence and export settings." />}
      </div>
    </DashboardLayout>
  );
}

function BrandingTab() {
  const { data: company } = useGetMyCompany({ request: { headers: getAuthHeaders() } });
  const updateCompany = useUpdateMyCompany({ request: { headers: getAuthHeaders() } });
  const { toast } = useToast();

  const [brandColor, setBrandColor] = useState('#00C9A7');
  const [logoUrl, setLogoUrl] = useState('');
  const [previewColor, setPreviewColor] = useState('#00C9A7');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (company) {
      const c = (company as any).brand_color || '#00C9A7';
      setBrandColor(c);
      setPreviewColor(c);
      setLogoUrl((company as any).logo_url || '');
    }
  }, [company]);

  const handleColorChange = (hex: string) => {
    setBrandColor(hex);
    setPreviewColor(hex);
    applyTenantColor(hex);
  };

  const handleSave = () => {
    updateCompany.mutate(
      { data: { brand_color: brandColor } as any },
      {
        onSuccess: () => {
          applyTenantColor(brandColor);
          toast({ title: "Brand updated", description: "Color is live across the app." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to save brand settings." });
        }
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please choose a PNG, JPG, or WebP file." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 2MB." });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/companies/logo', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      const freshUrl = `${data.logo_url}?t=${Date.now()}`;
      setLogoUrl(freshUrl);
      setSelectedFile(null);
      setUploadPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: "Logo uploaded", description: "Refreshing to apply changes..." });
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const hexToRgb = (hex: string) => {
    const c = hex.replace('#', '');
    return `${parseInt(c.slice(0,2),16)}, ${parseInt(c.slice(2,4),16)}, ${parseInt(c.slice(4,6),16)}`;
  };

  const previewRgb = hexToRgb(previewColor);
  const displayLogoUrl = uploadPreview || logoUrl;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
      {/* Left: Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Brand Color */}
        <Section title="Brand Color" desc="Applied across all accents, buttons, and highlights.">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="color"
              value={brandColor}
              onChange={e => handleColorChange(e.target.value)}
              style={{ width: '48px', height: '48px', padding: '2px', backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC', borderRadius: '8px', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={brandColor}
              onChange={e => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                  setBrandColor(e.target.value);
                  if (e.target.value.length === 7) handleColorChange(e.target.value);
                }
              }}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#1A1917', backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC', borderRadius: '6px', padding: '8px 14px', width: '120px', letterSpacing: '0.08em', outline: 'none' }}
            />
          </div>
          <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px' }}>Affects sidebar, buttons, badges, charts.</p>
          <button
            onClick={handleSave}
            disabled={updateCompany.isPending}
            style={{ marginTop: '12px', padding: '8px 20px', backgroundColor: 'var(--brand)', color: '#FFFFFF', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: updateCompany.isPending ? 0.7 : 1 }}
          >
            {updateCompany.isPending ? 'Saving...' : 'Save Color'}
          </button>
        </Section>

        {/* Logo Upload */}
        <Section title="Company Logo" desc="PNG or JPG, transparent background recommended, max 2MB.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Current / preview on both backgrounds */}
            {displayLogoUrl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: '#1A1917', border: '1px solid #333', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <img src={displayLogoUrl} alt="Logo dark" style={{ maxHeight: '40px', maxWidth: '100%', objectFit: 'contain' }} />
                  <span style={{ fontSize: '10px', color: '#9E9B94' }}>Dark bg</span>
                </div>
                <div style={{ backgroundColor: '#F0EDE8', border: '1px solid #DDD', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <img src={displayLogoUrl} alt="Logo light" style={{ maxHeight: '40px', maxWidth: '100%', objectFit: 'contain' }} />
                  <span style={{ fontSize: '10px', color: '#888' }}>Light bg</span>
                </div>
              </div>
            )}

            {/* No logo state */}
            {!displayLogoUrl && (
              <div style={{ backgroundColor: '#F7F6F3', border: '1px dashed #DEDAD4', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={24} color="#9E9B94" />
                <span style={{ fontSize: '12px', color: '#9E9B94' }}>No logo uploaded yet</span>
              </div>
            )}

            {/* File picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, height: '38px', backgroundColor: '#F7F6F3',
                  border: '1px solid #DEDAD4', borderRadius: '8px',
                  color: '#1A1917', fontSize: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <Upload size={13} />
                {selectedFile ? selectedFile.name : 'Choose file...'}
              </button>
              {selectedFile && (
                <button
                  onClick={() => { setSelectedFile(null); setUploadPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{ width: '38px', height: '38px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{ height: '40px', backgroundColor: 'var(--brand)', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </button>
            )}

            <p style={{ fontSize: '11px', color: '#9E9B94', margin: 0 }}>
              PNG with transparent background works best. The logo appears in the sidebar header.
            </p>
          </div>
        </Section>
      </div>

      {/* Right: Preview */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEECE7' }}>
          <p style={{ fontSize: '11px', color: '#9E9B94', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Sidebar Preview</p>
        </div>
        <div style={{ padding: '16px' }}>
          {/* Company header */}
          <div style={{ paddingBottom: '12px', borderBottom: '1px solid #EEECE7', marginBottom: '12px' }}>
            {displayLogoUrl ? (
              <div style={{ backgroundColor: '#F7F6F3', borderRadius: '6px', padding: '4px 8px', display: 'inline-block', marginBottom: '4px', border: '1px solid #EEECE7' }}>
                <img src={displayLogoUrl} alt="Logo" style={{ height: '26px', width: 'auto', objectFit: 'contain', display: 'block' }} />
              </div>
            ) : (
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '14px', color: '#1A1917', margin: '0 0 4px 0' }}>{(company as any)?.name || 'Your Company'}</p>
            )}
            <p style={{ fontSize: '11px', color: '#9E9B94', margin: 0 }}>CleanOps Pro</p>
          </div>
          {[
            { label: 'Dashboard', active: false },
            { label: 'Jobs', active: true },
            { label: 'Employees', active: false },
            { label: 'Customers', active: false },
          ].map(item => (
            <div key={item.label} style={{
              height: '34px', padding: '0 10px', margin: '2px 0',
              borderRadius: '6px', display: 'flex', alignItems: 'center',
              backgroundColor: item.active ? `rgba(${previewRgb}, 0.07)` : 'transparent',
              color: item.active ? previewColor : '#6B7280',
              fontSize: '13px', fontWeight: item.active ? 500 : 400,
            }}>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const { data: company } = useGetMyCompany({ request: { headers: getAuthHeaders() } });
  const updateCompany = useUpdateMyCompany({ request: { headers: getAuthHeaders() } });
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [payCadence, setPayCadence] = useState('biweekly');

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setPayCadence(company.pay_cadence || 'biweekly');
    }
  }, [company]);

  const handleSave = () => {
    updateCompany.mutate(
      { data: { name, pay_cadence: payCadence as any } as any },
      {
        onSuccess: () => toast({ title: "Settings saved", description: "Company profile updated." }),
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to save settings." }),
      }
    );
  };

  return (
    <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Section title="Company Name" desc="">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#1A1917', backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC', borderRadius: '6px', padding: '10px 14px', outline: 'none' }}
        />
      </Section>
      <Section title="Pay Cadence" desc="How often payroll is processed.">
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Bi-weekly' }, { id: 'semimonthly', label: 'Semi-monthly' }].map(opt => (
            <button key={opt.id} onClick={() => setPayCadence(opt.id)} style={{ padding: '7px 16px', borderRadius: '6px', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer', border: payCadence === opt.id ? 'none' : '1px solid #E5E2DC', backgroundColor: payCadence === opt.id ? 'var(--brand)' : 'transparent', color: payCadence === opt.id ? '#FFFFFF' : '#6B7280' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </Section>
      <button onClick={handleSave} disabled={updateCompany.isPending} style={{ alignSelf: 'flex-start', padding: '10px 24px', backgroundColor: 'var(--brand)', color: '#FFFFFF', borderRadius: '6px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, border: 'none', cursor: 'pointer', opacity: updateCompany.isPending ? 0.7 : 1 }}>
        {updateCompany.isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: '13px', color: '#1A1917', margin: '0 0 4px 0' }}>{title}</h3>
      {desc && <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>{desc}</p>}
      {children}
    </div>
  );
}

function PlaceholderTab({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center', border: '1px dashed #E5E2DC', borderRadius: '8px' }}>
      <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '24px', color: '#1A1917', margin: '0 0 8px 0' }}>{title}</h3>
      <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: '13px', color: '#6B7280', margin: 0 }}>{desc}</p>
    </div>
  );
}

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const TRIGGER_LABELS: Record<string, string> = {
  job_scheduled: "Job Scheduled",
  job_reminder_24h: "Job Reminder (24h before)",
  job_complete: "Job Completed",
  invoice_sent: "Invoice Sent",
  employee_clock_in: "Employee Clock In",
  payment_received: "Payment Received",
};

const CHANNEL_ICONS: Record<string, string> = {
  email: "📧", sms: "💬", in_app: "🔔",
};

const VARIABLES_HELP = [
  "{{client_name}}", "{{service_type}}", "{{date}}", "{{time}}",
  "{{company_name}}", "{{employee_name}}", "{{amount}}", "{{invoice_number}}",
];

function NotificationsTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  async function load() {
    try {
      const [t, l] = await Promise.all([
        fetch(`${API}/api/notifications/templates`, { headers: getAuthHeaders() }).then(r => r.json()),
        fetch(`${API}/api/notifications/log`, { headers: getAuthHeaders() }).then(r => r.json()),
      ]);
      setTemplates(t.data || []);
      setLogs(l.data || []);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggle(id: number, is_active: boolean) {
    const tmpl = templates.find(t => t.id === id);
    if (!tmpl) return;
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active } : t));
    try {
      await fetch(`${API}/api/notifications/templates/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active, subject: tmpl.subject, body: tmpl.body }),
      });
      toast({ title: `Notification ${is_active ? "enabled" : "disabled"}` });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
      load();
    }
  }

  async function save(id: number) {
    setSaving(id);
    try {
      const tmpl = templates.find(t => t.id === id)!;
      await fetch(`${API}/api/notifications/templates/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: tmpl.is_active, subject: editSubject, body: editBody }),
      });
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, subject: editSubject, body: editBody } : t));
      toast({ title: "Template saved ✓" });
      setEditingId(null);
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setSaving(null); }
  }

  async function testNotification(id: number) {
    setTesting(id);
    try {
      const r = await fetch(`${API}/api/notifications/templates/${id}/test`, {
        method: "POST", headers: getAuthHeaders(),
      });
      const d = await r.json();
      toast({ title: "Test sent!", description: d.message });
      load();
    } catch { toast({ title: "Test failed", variant: "destructive" }); }
    finally { setTesting(null); }
  }

  function startEdit(tmpl: any) {
    setEditingId(tmpl.id);
    setEditBody(tmpl.body);
    setEditSubject(tmpl.subject || "");
  }

  const FF = "'Plus Jakarta Sans', sans-serif";
  const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E2DC', borderRadius: 12, padding: '18px 20px', marginBottom: 12 };

  if (loading) return <div style={{ padding: '40px 0', textAlign: 'center', color: '#9E9B94', fontFamily: FF }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontFamily: FF }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1917', margin: '0 0 4px' }}>Notification Triggers</p>
          <p style={{ fontSize: 12, color: '#9E9B94', margin: 0 }}>Configure automatic messages sent to clients and staff</p>
        </div>
        <button onClick={() => setShowLog(!showLog)}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand, #5B9BD5)', background: '#EBF4FF', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: FF }}>
          {showLog ? "Hide Log" : "📋 View Log"} {logs.length > 0 && `(${logs.length})`}
        </button>
      </div>

      {showLog && (
        <div style={{ ...CARD, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1917', margin: '0 0 12px' }}>Recent Notification Log</p>
          {logs.length === 0 && <p style={{ fontSize: 12, color: '#9E9B94', margin: 0 }}>No notifications sent yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {logs.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: '#F7F6F3', borderRadius: 6, alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1917' }}>{TRIGGER_LABELS[l.trigger] || l.trigger}</span>
                  <span style={{ fontSize: 11, color: '#9E9B94', marginLeft: 8 }}>{CHANNEL_ICONS[l.channel] || l.channel} → {l.recipient}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: l.status === 'test_sent' ? '#7C3AED' : '#16A34A', fontWeight: 600 }}>{l.status}</span>
                  <span style={{ fontSize: 10, color: '#9E9B94' }}>{new Date(l.sent_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {templates.map(tmpl => (
        <div key={tmpl.id} style={{ ...CARD, borderLeft: `3px solid ${tmpl.is_active ? 'var(--brand, #5B9BD5)' : '#E5E2DC'}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: editingId === tmpl.id ? 14 : 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{CHANNEL_ICONS[tmpl.channel]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1917' }}>{TRIGGER_LABELS[tmpl.trigger] || tmpl.trigger}</span>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9E9B94', background: '#F3F4F6', padding: '2px 7px', borderRadius: 4 }}>{tmpl.channel}</span>
              </div>
              {editingId !== tmpl.id && (
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {tmpl.subject ? <><strong>{tmpl.subject}</strong> — </> : ""}{tmpl.body}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => toggle(tmpl.id, !tmpl.is_active)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: tmpl.is_active ? 'var(--brand, #5B9BD5)' : '#E5E2DC', position: 'relative', transition: 'background 0.2s',
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9, background: '#fff',
                  position: 'absolute', top: 3, left: tmpl.is_active ? 23 : 3,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}/>
              </button>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => editingId === tmpl.id ? setEditingId(null) : startEdit(tmpl)}
                  style={{ fontSize: 11, color: 'var(--brand, #5B9BD5)', background: '#EBF4FF', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: FF, fontWeight: 600 }}>
                  {editingId === tmpl.id ? "Cancel" : "Edit"}
                </button>
                <button onClick={() => testNotification(tmpl.id)} disabled={testing === tmpl.id}
                  style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: FF }}>
                  {testing === tmpl.id ? "…" : "Test"}
                </button>
              </div>
            </div>
          </div>

          {editingId === tmpl.id && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tmpl.channel === 'email' && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9E9B94', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject Line</p>
                  <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E2DC', borderRadius: 7, fontSize: 13, fontFamily: FF, outline: 'none', boxSizing: 'border-box' }}/>
                </div>
              )}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9E9B94', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Message Body</p>
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                  style={{ width: '100%', height: 120, padding: '10px 12px', border: '1px solid #E5E2DC', borderRadius: 7, fontSize: 12, fontFamily: FF, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}/>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#9E9B94', alignSelf: 'center', marginRight: 2 }}>Variables:</span>
                {VARIABLES_HELP.map(v => (
                  <button key={v} onClick={() => setEditBody(b => b + v)}
                    style={{ fontSize: 10, color: '#7C3AED', background: '#EDE9FE', border: 'none', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontFamily: FF }}>
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setEditingId(null)}
                  style={{ padding: '7px 14px', border: '1px solid #E5E2DC', borderRadius: 7, background: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: FF }}>
                  Cancel
                </button>
                <button onClick={() => save(tmpl.id)} disabled={saving === tmpl.id}
                  style={{ padding: '7px 16px', border: 'none', borderRadius: 7, background: 'var(--brand, #5B9BD5)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FF }}>
                  {saving === tmpl.id ? "Saving…" : "Save Template"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
