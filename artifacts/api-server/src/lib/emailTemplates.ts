import { BranchConfig } from "./branchRouter";

export interface ConfirmationEmailParams {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceType: string;
  scheduledDate: string;
  arrivalWindow: string;
  serviceAddress: string;
  addressLine2?: string | null;
  preferredContactMethod: string;
  basePrice: number;
  addons: Array<{ name: string; amount: number }>;
  bundleDiscount: number;
  firstVisitTotal: number;
  specialNotes?: string | null;
  sqft?: number | null;
  branchConfig: BranchConfig;
  jobId?: number | null;
  clientId?: number | null;
  stripeCustomerId?: string | null;
  stripePaymentMethodId?: string | null;
  bedrooms?: number | null;
  fullBathrooms?: number | null;
  halfBathrooms?: number | null;
  floors?: number | null;
  people?: number | null;
  pets?: number | null;
  cleanlinessRating?: number | null;
  acquisitionSource?: string | null;
}

export interface ReminderEmailParams {
  firstName: string;
  email: string;
  serviceType: string;
  scheduledDate: string;
  arrivalWindow: string;
  serviceAddress: string;
  addressLine2?: string | null;
  branchConfig: BranchConfig;
  hoursAhead: 72 | 24;
}

function detectServiceType(serviceType: string): "deep" | "standard" | "moveinout" | "recurring" {
  const s = (serviceType || "").toLowerCase();
  if (s.includes("move") || s.includes("move in") || s.includes("move out")) return "moveinout";
  if (s.includes("recurring")) return "recurring";
  if (s.includes("deep")) return "deep";
  return "standard";
}

function getSubjectLine(serviceType: string): string {
  const t = detectServiceType(serviceType);
  if (t === "deep") return "Your Phes Deep Clean is Confirmed";
  if (t === "moveinout") return "Your Phes Move In/Out Clean is Confirmed";
  if (t === "recurring") return "Your Phes Recurring Service is Confirmed";
  return "Your Phes Cleaning is Confirmed";
}

const BASE = `font-family:'Plus Jakarta Sans',Arial,sans-serif`;
const BLUE = "#5B9BD5";
const DARK = "#1A1917";
const MID = "#6B6860";

function appointmentSummaryBlock(p: { serviceType: string; scheduledDate: string; arrivalWindow: string; serviceAddress: string; addressLine2?: string | null; preferredContactMethod: string }): string {
  const fullAddress = p.addressLine2 ? `${p.serviceAddress}, ${p.addressLine2}` : p.serviceAddress;
  return `
<div style="background:#EBF4FF;border-left:4px solid ${BLUE};padding:16px;margin-bottom:24px;border-radius:0 4px 4px 0;">
  <strong style="color:${DARK};font-size:15px;">Your Appointment Details</strong><br><br>
  <span style="color:${MID};">Service:</span> <strong>${p.serviceType}</strong><br>
  <span style="color:${MID};">Date:</span> <strong>${p.scheduledDate}</strong><br>
  <span style="color:${MID};">Arrival Window:</span> <strong>${p.arrivalWindow}</strong><br>
  <span style="color:${MID};">Address:</span> <strong>${fullAddress}</strong><br>
  <span style="color:${MID};">Preferred Contact:</span> <strong>${p.preferredContactMethod}</strong><br><br>
  Our office will reach out via <strong>${p.preferredContactMethod}</strong> to confirm your exact arrival time within your window.<br><br>
  You will also receive automatic reminders:<br>
  &bull; 72 hours before your appointment via SMS and email<br>
  &bull; 24 hours before your appointment via SMS and email
</div>`;
}

function siteRequirementsSection(serviceKind: "deep" | "standard" | "moveinout" | "recurring"): string {
  const isMoveinout = serviceKind === "moveinout";
  const toiletBrushLine = isMoveinout ? "" : `<p style="margin:0 0 8px;"><strong>Maintenance Clients:</strong> Please provide a toilet brush for our team to use inside your toilets.</p>`;
  const moveInOutLine = isMoveinout ? `<p style="margin:0 0 8px;"><strong>Move-In/Out Clients:</strong> Property must be empty of furniture and people. We will work around any items left behind, which may result in subpar cleaning; no refunds will be issued for these conditions.</p>` : "";
  return `
<div style="margin-bottom:24px;">
  <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">Site Requirements &amp; Preparation</h3>
  <p style="margin:0 0 8px;"><strong>Utilities:</strong> Running water, electricity, and sufficient lighting must be available. If utilities are inactive, we reserve the right to cancel, and the full fee will still apply.</p>
  <p style="margin:0 0 8px;"><strong>Declutter:</strong> Please have personal items, toys, and clothes cleared away. We cannot clean sinks or countertops full of dishes. Highly cluttered surfaces may be skipped at our discretion.</p>
  <p style="margin:0 0 8px;"><strong>Renovations:</strong> Please disclose if your home has recently undergone construction/renovation, as this requires specific post-construction pricing.</p>
  ${toiletBrushLine}${moveInOutLine}
  <p style="margin:0 0 8px;"><strong>Hourly service:</strong> We bill upon the start of the job the minimum of 3 hours for standard cleaning and 4 hours for deep or move-in-out cleaning. Any additional time needed will be communicated to you and billed to the card on file at the end of service.</p>
</div>`;
}

function cancellationPolicySection(): string {
  return `
<div style="margin-bottom:24px;">
  <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">Cancellation &amp; Rescheduling Policy</h3>
  <p style="margin:0 0 8px;">We reserve time specifically for your home. To protect our staff's wages, we enforce the following:</p>
  <p style="margin:0 0 8px;"><strong>48-Hour Notice:</strong> Cancellations/rescheduling must be made 48 business hours in advance. Sundays do not count.</p>
  <p style="margin:0 0 8px;"><strong>Monday Appts:</strong> Notify us by Friday before 6:00 PM CT.<br><strong>Tuesday Appts:</strong> Notify us by Saturday before 12:00 PM CT.</p>
  <p style="margin:0 0 8px;"><strong>Fees:</strong> Cancellations within 48 hours or No-Shows result in a 100% charge of the service fee.</p>
  <p style="margin:0 0 8px;"><strong>Rescheduling:</strong> Clients are allowed ONE reschedule per appointment. Any additional reschedule request will be treated as a late cancellation and will incur a 100% fee regardless of whether the request is made within or outside the 48-hour window.</p>
  <p style="margin:0 0 8px;"><strong>Lockouts:</strong> Our team will wait a maximum of 20 minutes. If we cannot gain access and cannot reach you, the appointment is forfeited and billed in full.</p>
</div>`;
}

function safetySection(): string {
  return `
<div style="margin-bottom:24px;">
  <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">Safety, Liability &amp; Exclusions</h3>
  <p style="margin:0 0 8px;"><strong>Biohazards:</strong> Per OSHA guidelines, we do not clean human/animal waste (feces, urine, vomit), blood, or insect infestations.</p>
  <p style="margin:0 0 8px;"><strong>Climate:</strong> Cleaners are authorized to adjust AC/Heat to a safe working temperature while on-site.</p>
  <p style="margin:0 0 8px;"><strong>Damage Cap:</strong> Our liability for any damage is limited to the total cost of the cleaning service. We are not responsible for improperly secured items (loose shelves/frames) or items of extreme sentimental value.</p>
  <p style="margin:0;"><strong>Exclusions:</strong> We do not offer bed-making, laundry, dishwashing, wall spot-cleaning, or moving heavy furniture.</p>
</div>`;
}

function guaranteeSection(): string {
  return `
<div style="margin-bottom:24px;">
  <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">The 24-Hour Right to Rectify</h3>
  <p style="margin:0 0 8px;"><strong>Our Guarantee:</strong> If we miss a spot, contact us within 24 hours. We will return to re-clean the area at no cost.</p>
  <p style="margin:0;"><strong>No Refunds:</strong> As a labor-based service, we do not offer refunds. The re-clean is our sole remedy for quality disputes.</p>
</div>`;
}

function homeAccessSection(): string {
  return `
<div style="margin-bottom:24px;">
  <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">Home Access Options</h3>
  <p style="margin:0 0 8px;">How will we be entering your home?</p>
  <p style="margin:0 0 4px;"><strong>1. Be Home:</strong> Wait for our arrival during the window.</p>
  <p style="margin:0 0 4px;"><strong>2. Keys/Codes:</strong> Provide us with a spare key or electronic entry code.</p>
  <p style="margin:0;"><strong>3. Secure Lockbox:</strong> We can provide a master lockbox for $50.00. Must be returned upon termination of service or a $75.00 fee applies.</p>
</div>`;
}

function nonSolicitationSection(): string {
  return `
<div style="margin-bottom:24px;">
  <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">Non-Solicitation Agreement</h3>
  <p style="margin:0;">Our staff is our greatest asset. By using our services, you agree not to solicit, hire, or contract any Phes staff member privately. Any breach will result in the immediate termination of your service agreement.</p>
</div>`;
}

function pricingNoteSection(): string {
  return `
<div style="margin-bottom:24px;">
  <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 8px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">Pricing Note</h3>
  <p style="margin:0;">Flat Rate estimates are based on your selections. If the home's condition differs significantly, we will provide an updated estimate. Extra time is billed at $65/hour per cleaner.</p>
</div>`;
}

function recurringUpsellSection(branchConfig: BranchConfig): string {
  return `
<div style="background:#F0F7FF;border:1px solid #BDD9F2;border-radius:6px;padding:16px;margin-bottom:24px;">
  <h3 style="color:${BLUE};font-size:15px;font-weight:700;margin:0 0 8px;">Interested in Regular Cleaning Service?</h3>
  <p style="margin:0 0 8px;color:${DARK};">Clients on a recurring schedule receive preferred scheduling, consistent technician assignment, and discounted rates. Weekly, biweekly, and monthly plans are available.</p>
  <p style="margin:0;color:${DARK};">Call us at <strong>${branchConfig.clientPhoneFormatted}</strong> or reply to this email to set up your recurring service today.</p>
</div>`;
}

function serviceDetailsTable(p: ConfirmationEmailParams): string {
  const addonRows = p.addons.map(a => `
  <tr>
    <td style="padding:8px 0;color:${DARK};border-bottom:1px solid #F0EEEB;">${a.name}</td>
    <td style="padding:8px 0;color:${DARK};text-align:right;border-bottom:1px solid #F0EEEB;">+$${a.amount.toFixed(2)}</td>
  </tr>`).join("");
  const discountRow = p.bundleDiscount > 0 ? `
  <tr>
    <td style="padding:8px 0;color:#2D6A4F;border-bottom:1px solid #F0EEEB;">Appliance Bundle Discount</td>
    <td style="padding:8px 0;color:#2D6A4F;text-align:right;border-bottom:1px solid #F0EEEB;">-$${p.bundleDiscount.toFixed(2)}</td>
  </tr>` : "";
  return `
<div style="margin-bottom:24px;">
  <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">Service Details</h3>
  <p style="margin:0 0 12px;color:${MID};">We've itemized the services we are providing.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr>
      <td style="padding:8px 0;color:${DARK};border-bottom:1px solid #F0EEEB;">${p.serviceType}${p.sqft ? ` &mdash; ${p.sqft.toLocaleString()} sqft` : ""}</td>
      <td style="padding:8px 0;color:${DARK};text-align:right;border-bottom:1px solid #F0EEEB;">$${p.basePrice.toFixed(2)}</td>
    </tr>
    ${addonRows}
    ${discountRow}
    <tr>
      <td style="padding:10px 0;color:${DARK};font-weight:700;"><strong>First Visit Total</strong></td>
      <td style="padding:10px 0;color:${DARK};text-align:right;font-weight:700;"><strong>$${p.firstVisitTotal.toFixed(2)}</strong></td>
    </tr>
  </table>
</div>`;
}

function emailWrapper(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F6F3;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#fff;border:1px solid #E5E2DC;border-radius:10px;overflow:hidden;">
    <div style="background:${BLUE};padding:20px 28px;">
      <span style="color:#fff;font-size:20px;font-weight:800;${BASE};">Phes</span>
    </div>
    <div style="padding:28px;${BASE};color:${DARK};font-size:14px;line-height:1.6;">
      ${body}
    </div>
  </div>
</div>
</body></html>`;
}

export function buildClientConfirmationEmail(p: ConfirmationEmailParams): { subject: string; html: string } {
  const subject = getSubjectLine(p.serviceType);
  const kind = detectServiceType(p.serviceType);
  const showUpsell = kind === "deep" || kind === "standard";
  const fullAddress = p.addressLine2 ? `${p.serviceAddress}, ${p.addressLine2}` : p.serviceAddress;

  const body = `
    ${appointmentSummaryBlock({
      serviceType: p.serviceType,
      scheduledDate: p.scheduledDate,
      arrivalWindow: p.arrivalWindow,
      serviceAddress: p.serviceAddress,
      addressLine2: p.addressLine2,
      preferredContactMethod: p.preferredContactMethod,
    })}

    <h2 style="color:${DARK};font-size:18px;font-weight:800;margin:0 0 8px;">${p.firstName}, thank you for your business!</h2>
    <p style="margin:0 0 20px;color:${MID};">Your cleaning is officially scheduled! We are excited to help you refresh your home. Please review the details of your appointment and our service policies below to ensure everything goes smoothly.</p>

    <div style="margin-bottom:24px;">
      <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">What Happens Next</h3>
      <ol style="margin:0;padding-left:20px;color:${DARK};">
        <li style="margin-bottom:6px;">Our office will contact you via <strong>${p.preferredContactMethod}</strong> to confirm your exact arrival time within your window</li>
        <li style="margin-bottom:6px;">You will receive an SMS and email reminder <strong>72 hours</strong> before your appointment</li>
        <li style="margin-bottom:6px;">You will receive an SMS and email reminder <strong>24 hours</strong> before your appointment</li>
        <li style="margin-bottom:6px;">Your technician will arrive during your selected window</li>
        <li style="margin-bottom:6px;">After your cleaning you will receive a satisfaction follow-up from our team</li>
        <li style="margin-bottom:0;">Your card on file will be charged upon job completion</li>
      </ol>
    </div>

    ${cancellationPolicySection()}
    ${siteRequirementsSection(kind)}
    ${safetySection()}
    ${guaranteeSection()}
    ${homeAccessSection()}
    ${nonSolicitationSection()}
    ${pricingNoteSection()}
    ${showUpsell ? recurringUpsellSection(p.branchConfig) : ""}

    <div style="margin-bottom:24px;">
      <h3 style="color:${DARK};font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #E5E2DC;padding-bottom:8px;">Client Details</h3>
      <p style="margin:0 0 4px;">Please verify the information below and contact us at <strong>${p.branchConfig.clientPhoneFormatted}</strong> or <a href="mailto:${p.branchConfig.officeEmail}" style="color:${BLUE};">${p.branchConfig.officeEmail}</a> if you have any concerns or questions. Thank you again for your business.</p>
      <p style="margin:8px 0 4px;color:${MID};">Be sure to check out <a href="https://phes.io" style="color:${BLUE};">phes.io</a> to find out about all the great services Phes offers!</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px;">
        <tr><td style="padding:6px 0;color:${MID};">Address</td><td style="padding:6px 0;">${fullAddress}</td></tr>
        <tr><td style="padding:6px 0;color:${MID};">Payment Method</td><td style="padding:6px 0;">Card on file</td></tr>
        <tr><td style="padding:6px 0;color:${MID};">Preferred Contact</td><td style="padding:6px 0;">${p.preferredContactMethod}</td></tr>
        <tr><td style="padding:6px 0;color:${MID};">Email</td><td style="padding:6px 0;">${p.email}</td></tr>
        <tr><td style="padding:6px 0;color:${MID};">Phone</td><td style="padding:6px 0;">${p.phone}</td></tr>
      </table>
    </div>

    ${serviceDetailsTable(p)}

    <p style="margin:16px 0 4px;color:${MID};font-size:12px;">Review our full <a href="https://phes.io/terms" style="color:${BLUE};">Terms and Conditions</a> and <a href="https://phes.io/privacy-policy" style="color:${BLUE};">Privacy Policy</a>.</p>

    <div style="border-top:1px solid #E5E2DC;margin-top:24px;padding-top:16px;color:${MID};font-size:13px;">
      <strong style="color:${DARK};">Phes</strong><br>
      ${p.branchConfig.clientPhoneFormatted}<br>
      <a href="mailto:${p.branchConfig.officeEmail}" style="color:${BLUE};">${p.branchConfig.officeEmail}</a><br>
      <a href="https://phes.io" style="color:${BLUE};">phes.io</a>
    </div>`;

  return { subject, html: emailWrapper(body) };
}

export function buildOfficeNotificationEmail(p: ConfirmationEmailParams): { subject: string; html: string } {
  const dateLabel = p.scheduledDate;
  const subject = `New Booking — ${p.firstName} ${p.lastName} — ${p.serviceType} — ${dateLabel}`;
  const fullAddress = p.addressLine2 ? `${p.serviceAddress}, ${p.addressLine2}` : p.serviceAddress;
  const addonsStr = p.addons.length > 0 ? p.addons.map(a => a.name).join(", ") : "None";
  const bundleStr = p.bundleDiscount > 0 ? `$${p.bundleDiscount.toFixed(2)}` : "N/A";

  const cleanlinessLabel = (r?: number | null) => {
    if (!r) return "N/A";
    if (r === 1) return "1 — Very Clean";
    if (r === 2) return "2 — Moderately Clean";
    if (r === 3) return "3 — Very Dirty";
    return String(r);
  };

  const body = `
    <h2 style="color:${DARK};font-size:18px;font-weight:800;margin:0 0 20px;">NEW ONLINE BOOKING</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:${MID};width:180px;border-bottom:1px solid #F0EEEB;">Client</td><td style="padding:8px 0;font-weight:700;border-bottom:1px solid #F0EEEB;">${p.firstName} ${p.lastName}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Phone</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.phone}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Email</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.email}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Branch</td><td style="padding:8px 0;font-weight:700;border-bottom:1px solid #F0EEEB;">${p.branchConfig.branch.replace("_", " ").toUpperCase()}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Service</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.serviceType}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Date</td><td style="padding:8px 0;font-weight:700;border-bottom:1px solid #F0EEEB;">${dateLabel}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Arrival Window</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.arrivalWindow}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Address</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${fullAddress}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Square Footage</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.sqft ? `${p.sqft.toLocaleString()} sqft` : "N/A"}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Bedrooms</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.bedrooms ?? "N/A"}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Bathrooms</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.fullBathrooms ?? 0} full / ${p.halfBathrooms ?? 0} half</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Floors</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.floors ?? "N/A"}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">People in Household</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.people ?? "N/A"}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Pets</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.pets ?? 0}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Cleanliness Rating</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${cleanlinessLabel(p.cleanlinessRating)}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Add-ons</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${addonsStr}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Bundle Discount</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${bundleStr}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Special Notes</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.specialNotes || "None"}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Preferred Contact</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.preferredContactMethod}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">How They Found Us</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.acquisitionSource || "N/A"}</td></tr>
      <tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">First Visit Total</td><td style="padding:8px 0;font-weight:700;border-bottom:1px solid #F0EEEB;">$${p.firstVisitTotal.toFixed(2)}</td></tr>
      ${p.stripeCustomerId ? `<tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Stripe Customer ID</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.stripeCustomerId}</td></tr>` : ""}
      ${p.stripePaymentMethodId ? `<tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Stripe Payment Method</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">${p.stripePaymentMethodId}</td></tr>` : ""}
      ${p.clientId ? `<tr><td style="padding:8px 0;color:${MID};border-bottom:1px solid #F0EEEB;">Client ID</td><td style="padding:8px 0;border-bottom:1px solid #F0EEEB;">#${p.clientId}</td></tr>` : ""}
      ${p.jobId ? `<tr><td style="padding:8px 0;color:${MID};">Job ID</td><td style="padding:8px 0;">#${p.jobId}</td></tr>` : ""}
    </table>`;

  return { subject, html: emailWrapper(body) };
}

export function buildReminderEmail(p: ReminderEmailParams): { subject: string; html: string } {
  const is72 = p.hoursAhead === 72;
  const subject = is72
    ? "Reminder: Your Phes Cleaning is in 3 Days"
    : "Reminder: Your Phes Cleaning is Tomorrow";
  const fullAddress = p.addressLine2 ? `${p.serviceAddress}, ${p.addressLine2}` : p.serviceAddress;

  const bodyIntro = is72
    ? `<p style="margin:0 0 16px;color:${DARK};">Hi <strong>${p.firstName}</strong>, this is a friendly reminder that your Phes cleaning is coming up in <strong>3 days</strong>.</p>
       <p style="margin:0 0 16px;color:${MID};">If you need to reschedule, please contact us at least 48 business hours before your appointment. Remember — Sundays do not count toward this window.</p>
       <p style="margin:0 0 8px;color:${MID};">Monday appointments: notify us by Friday before 6:00 PM CT.</p>
       <p style="margin:0 0 16px;color:${MID};">Tuesday appointments: notify us by Saturday before 12:00 PM CT.</p>`
    : `<p style="margin:0 0 16px;color:${DARK};">Hi <strong>${p.firstName}</strong>, your Phes cleaning is <strong>tomorrow!</strong></p>
       <p style="margin:0 0 16px;color:${MID};">Your team will arrive during your <strong>${p.arrivalWindow}</strong> window. Please ensure your home is accessible and all utilities are active — running water, electricity, and sufficient lighting must be available.</p>
       <div style="margin-bottom:16px;">
         <strong style="color:${DARK};">Home Access Reminder:</strong>
         <ul style="margin:8px 0;padding-left:20px;color:${MID};">
           <li>Be home during your arrival window, OR</li>
           <li>Ensure your key, entry code, or lockbox is ready for our team</li>
         </ul>
       </div>
       <p style="margin:0 0 16px;color:${MID};">Questions or need to make a change? Contact us immediately — please note our 48-hour cancellation policy applies.</p>`;

  const body = `
    <div style="background:#EBF4FF;border-left:4px solid ${BLUE};padding:16px;margin-bottom:24px;border-radius:0 4px 4px 0;">
      <strong style="color:${DARK};font-size:15px;">Your Appointment Details</strong><br><br>
      <span style="color:${MID};">Service:</span> <strong>${p.serviceType}</strong><br>
      <span style="color:${MID};">Date:</span> <strong>${p.scheduledDate}</strong><br>
      <span style="color:${MID};">Arrival Window:</span> <strong>${p.arrivalWindow}</strong><br>
      <span style="color:${MID};">Address:</span> <strong>${fullAddress}</strong>
    </div>
    ${bodyIntro}
    <p style="margin:0 0 4px;color:${MID};">Contact us: <strong>${p.branchConfig.clientPhoneFormatted}</strong> or <a href="mailto:${p.branchConfig.officeEmail}" style="color:${BLUE};">${p.branchConfig.officeEmail}</a></p>
    <div style="border-top:1px solid #E5E2DC;margin-top:24px;padding-top:16px;color:${MID};font-size:13px;">
      <strong style="color:${DARK};">Phes</strong><br>
      ${p.branchConfig.clientPhoneFormatted}<br>
      <a href="mailto:${p.branchConfig.officeEmail}" style="color:${BLUE};">${p.branchConfig.officeEmail}</a>
    </div>`;

  return { subject, html: emailWrapper(body) };
}
