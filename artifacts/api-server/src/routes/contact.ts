import { Router, type Request, type Response } from "express";

const router = Router();

// POST /api/contact — landing page contact form
// IMPORTANT: This route bypasses COMMS_ENABLED. Contact form submissions
// are direct inbound leads and must always send, even when automated
// outbound comms (SMS, email reminders) are suppressed.
router.post("/", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, businessName, email, message } = req.body;

    if (!firstName || !email || !message) {
      return res.status(400).json({ error: "First name, email, and message are required." });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("[contact] RESEND_API_KEY not configured — contact form email not sent");
      return res.status(500).json({ error: "Email service not configured." });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    await resend.emails.send({
      from: "Qleno <noreply@phes.io>",
      to: "salmartinez@phes.io",
      subject: `New Contact Form: ${firstName} ${lastName || ""} — ${businessName || "No business name"}`,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 560px;">
          <h2 style="color: #1A1917; margin-bottom: 16px;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6B6860; width: 120px;">Name</td>
              <td style="padding: 8px 0; color: #1A1917;">${firstName} ${lastName || ""}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B6860;">Business</td>
              <td style="padding: 8px 0; color: #1A1917;">${businessName || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B6860;">Email</td>
              <td style="padding: 8px 0; color: #1A1917;"><a href="mailto:${email}">${email}</a></td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 16px; background: #F7F6F3; border-radius: 8px;">
            <p style="color: #6B6860; font-size: 13px; margin: 0 0 8px;">Message</p>
            <p style="color: #1A1917; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    });

    console.log(`[contact] Form submission sent — ${firstName} ${lastName || ""} <${email}>`);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[contact] Failed to send contact form email:", err);
    return res.status(500).json({ error: "Failed to send message." });
  }
});

export default router;
