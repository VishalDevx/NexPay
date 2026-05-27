import { env } from "../config/env";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendWithResend(options: EmailOptions): Promise<EmailResult> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[Email] No RESEND_API_KEY configured. Logging email to ${options.to}: ${options.subject}`);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NexPay <noreply@nexpay.dev>",
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend API error: ${response.status} ${errorBody}`);
    }

    const data = await response.json() as { id?: string };
    return { success: true, messageId: data.id };
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${options.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

function emailTemplate(title: string, body: string, cta?: { text: string; url: string }): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="padding: 32px 24px; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
          <div style="width: 32px; height: 32px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">N</div>
          <span style="font-weight: 700; font-size: 18px; color: #f1f5f9;">NexPay</span>
        </div>
        <h1 style="font-size: 22px; font-weight: 700; color: #f8fafc; margin: 0 0 8px 0;">${title}</h1>
        <div style="color: #94a3b8; line-height: 1.6; font-size: 14px;">${body}</div>
        ${cta ? `<div style="margin-top: 24px;"><a href="${cta.url}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">${cta.text}</a></div>` : ""}
      </div>
      <div style="padding: 16px 24px; text-align: center; font-size: 12px; color: #475569; border-top: 1px solid #1e293b;">
        <p>NexPay Payment Infrastructure Platform</p>
        <p style="margin-top: 4px;">If you did not request this email, please ignore it.</p>
      </div>
    </div>
  `;
}

export const emailService = {
  async sendPasswordReset(email: string, resetUrl: string): Promise<EmailResult> {
    return sendWithResend({
      to: email,
      subject: "Reset your NexPay password",
      html: emailTemplate(
        "Password Reset Request",
        `<p>We received a request to reset your NexPay account password.</p>
         <p>Click the button below to set a new password. This link expires in 1 hour.</p>
         <p style="margin-top: 16px; color: #64748b;">If you did not request this, you can safely ignore this email.</p>`,
        { text: "Reset Password", url: resetUrl }
      ),
    });
  },

  async sendTeamInvite(email: string, inviterName: string, orgName: string, acceptUrl: string): Promise<EmailResult> {
    return sendWithResend({
      to: email,
      subject: `${inviterName} invited you to ${orgName} on NexPay`,
      html: emailTemplate(
        "Team Invitation",
        `<p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on NexPay.</p>
         <p>Click the button below to accept the invitation and set up your account.</p>
         <p style="margin-top: 16px; color: #64748b;">This invitation expires in 7 days.</p>`,
        { text: "Accept Invitation", url: acceptUrl }
      ),
    });
  },

  async sendInvoice(email: string, invoiceNumber: string, amount: string, currency: string, invoiceUrl: string): Promise<EmailResult> {
    return sendWithResend({
      to: email,
      subject: `Invoice ${invoiceNumber} from NexPay`,
      html: emailTemplate(
        `Invoice ${invoiceNumber}`,
        `<p>Your invoice of <strong>${currency} ${amount}</strong> is ready.</p>
         <p>Click the button below to view and pay your invoice.</p>`,
        { text: "View Invoice", url: invoiceUrl }
      ),
    });
  },

  async sendPaymentReceipt(email: string, amount: string, currency: string, paymentId: string): Promise<EmailResult> {
    return sendWithResend({
      to: email,
      subject: `Payment receipt - ${currency} ${amount}`,
      html: emailTemplate(
        "Payment Received",
        `<p>We've received a payment of <strong>${currency} ${amount}</strong>.</p>
         <p>Reference: <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${paymentId}</code></p>`,
      ),
    });
  },

  async sendSubscriptionFailure(email: string, planName: string): Promise<EmailResult> {
    return sendWithResend({
      to: email,
      subject: "Subscription payment failed - NexPay",
      html: emailTemplate(
        "Subscription Renewal Failed",
        `<p>Your <strong>${planName}</strong> subscription payment could not be processed.</p>
         <p>Please update your payment method to avoid service interruption. We will retry the payment automatically.</p>`,
        { text: "Update Payment Method", url: "https://nexpay.dev/dashboard/billing" }
      ),
    });
  },

  async sendKycApproved(email: string, merchantName: string): Promise<EmailResult> {
    return sendWithResend({
      to: email,
      subject: "KYC Approved - NexPay",
      html: emailTemplate(
        "KYC Verification Approved",
        `<p>Your <strong>${merchantName}</strong> account KYC verification has been approved.</p>
         <p>You can now process live payments and access all NexPay features.</p>`,
      ),
    });
  },

  async sendKycRejected(email: string, merchantName: string, reason: string): Promise<EmailResult> {
    return sendWithResend({
      to: email,
      subject: "KYC Verification Update - NexPay",
      html: emailTemplate(
        "KYC Verification Requires Attention",
        `<p>Your <strong>${merchantName}</strong> account KYC verification could not be completed.</p>
         <p>Reason: ${reason}</p>
         <p>Please resubmit your documents with the correct information.</p>`,
        { text: "Resubmit Documents", url: "https://nexpay.dev/dashboard/kyc" }
      ),
    });
  },

  async sendWebhookFailureAlert(email: string, endpointUrl: string, failuresCount: number): Promise<EmailResult> {
    return sendWithResend({
      to: email,
      subject: `Webhook delivery failures - ${failuresCount} failed`,
      html: emailTemplate(
        "Webhook Delivery Failure Alert",
        `<p>Your webhook endpoint <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px;">${endpointUrl}</code> has <strong>${failuresCount} failed deliveries</strong>.</p>
         <p>Please check your endpoint is reachable and returning 2xx status codes.</p>`,
        { text: "View Webhooks", url: "https://nexpay.dev/dashboard/webhooks" }
      ),
    });
  },

  async sendPayoutProcessed(email: string, amount: string, currency: string): Promise<EmailResult> {
    return sendWithResend({
      to: email,
      subject: `Payout processed - ${currency} ${amount}`,
      html: emailTemplate(
        "Payout Processed",
        `<p>Your payout of <strong>${currency} ${amount}</strong> has been processed and sent to your bank account.</p>
         <p>Settlement typically takes 1-3 business days to reflect in your account.</p>`,
      ),
    });
  },
};
