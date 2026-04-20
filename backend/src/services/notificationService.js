/**
 * Notification Service
 * Email notifications for candidate and user account workflows.
 * Uses nodemailer with Gmail SMTP.
 * Configure EMAIL_USER and EMAIL_APP_PASSWORD in .env
 * 
 * If nodemailer is not installed or email is not configured, 
 * notifications will be logged but not sent.
 */

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) {
    console.warn("⚠️  Email not configured. Notifications will be logged only.");
    return null;
  }

  try {
    const nodemailer = await import("nodemailer");

    // Gmail SMTP — port 465 SSL
    transporter = nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      connectionTimeout: 30000,
      socketTimeout: 30000,
      greetingTimeout: 30000,
    });

    await transporter.verify();
    console.log("✅ Email transporter ready (Gmail SMTP):", emailUser);
    return transporter;
  } catch (err) {
    console.warn("⚠️  Port 465 failed, trying port 587 STARTTLS...", err.message);
    try {
      const nodemailer = await import("nodemailer");
      transporter = nodemailer.default.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      await transporter.verify();
      console.log("✅ Email transporter ready (Gmail STARTTLS):", emailUser);
      return transporter;
    } catch (err2) {
      console.error("⚠️  Email setup failed on both ports:", err2.message);
      transporter = null;
      return null;
    }
  }
}

/**
 * Send round status update to candidate
 */
export async function sendRoundStatusUpdate(candidate, round, status) {
  const statusMessages = {
    completed: `Congratulations! You have successfully completed <strong>${round}</strong>.`,
    drop: `We regret to inform you that your application has been dropped at <strong>${round}</strong>.`,
    hold: `Your application is currently on <strong>HOLD</strong> at ${round}. We will get back to you shortly.`,
    "in-progress": `Your <strong>${round}</strong> interview is currently in progress.`,
  };

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1f2937;">Application Status Update</h2>
      <p>Dear ${candidate.firstName},</p>
      <p>${statusMessages[status] || `Your ${round} status has been updated to: ${status}`}</p>
      <p style="margin-top: 24px;">Best regards,<br/><strong>Tecnoprism HR Team</strong></p>
    </div>
  `;

  return sendEmail(
    candidate.email,
    `Application Update: ${round} - ${status.toUpperCase()}`,
    html
  );
}

/**
 * Send login credentials to a newly created HR/Admin user
 */
export async function sendUserCredentials(user, plainPassword, roleName) {
  const loginUrl = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/hr-login`
    : "http://localhost:5173/hr-login";

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Welcome to Tecnoprism HR Portal</h2>
        <p style="margin: 5px 0 0; opacity: 0.9;">Your account has been created</p>
      </div>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: 0; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>An account has been created for you on the Tecnoprism Interview Evaluation platform. Below are your login credentials:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #4f46e5;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 4px 0;"><strong>Password:</strong> ${plainPassword}</p>
          <p style="margin: 4px 0;"><strong>Role:</strong> ${roleName}</p>
        </div>
        <p style="margin: 16px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Login to Dashboard
          </a>
        </p>
        <p style="color: #ef4444; font-size: 13px; margin-top: 16px;">
          ⚠️ For security, please change your password after your first login.
        </p>
        <p style="margin-top: 24px;">Best regards,<br/><strong>Tecnoprism HR Team</strong></p>
      </div>
    </div>
  `;

  return sendEmail(
    user.email,
    "Your Tecnoprism HR Portal Login Credentials",
    html
  );
}

/**
 * Send candidate password reset email
 */
export async function sendCandidatePasswordResetEmail(candidate, resetToken) {
  const configuredFrontend = process.env.FRONTEND_URL || "http://localhost:5173";
  let frontendBaseUrl = configuredFrontend;

  try {
    const parsed = new URL(configuredFrontend);
    if (parsed.hostname !== "localhost" && parsed.protocol !== "https:") {
      parsed.protocol = "https:";
      frontendBaseUrl = parsed.toString().replace(/\/$/, "");
    } else {
      frontendBaseUrl = configuredFrontend.replace(/\/$/, "");
    }
  } catch {
    frontendBaseUrl = configuredFrontend.replace(/\/$/, "");
  }

  const resetUrl = `${frontendBaseUrl}/user-reset-password?token=${encodeURIComponent(resetToken)}`;

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1d4ed8; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Reset Your Candidate Password</h2>
        <p style="margin: 5px 0 0; opacity: 0.9;">Tecnoprism Walking Interview Portal</p>
      </div>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: 0; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hello <strong>${candidate.firstName || "Candidate"}</strong>,</p>
        <p>We received a request to reset your password.</p>
        <p style="margin: 16px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          This link expires in 15 minutes. If you did not request this change, you can ignore this email.
        </p>
        <p style="margin-top: 24px;">Best regards,<br/><strong>Tecnoprism Support Team</strong></p>
      </div>
    </div>
  `;

  return sendEmail(
    candidate.email,
    "Reset your Tecnoprism candidate password",
    html
  );
}

/**
 * Core email sending function with retry and Outlook-friendly headers
 */
async function sendEmail(to, subject, html) {
  const mailer = await getTransporter();

  if (!mailer) {
    console.log(`[EMAIL LOG] To: ${to} | Subject: ${subject}`);
    return { success: true, logged: true };
  }

  const emailUser = process.env.EMAIL_USER;
  const plainText = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  // Generate a proper Message-ID for better deliverability
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@tecnoprism.com>`;

  const mailOptions = {
    from: {
      name: "Tecnoprism HR Portal",
      address: emailUser,
    },
    to,
    subject,
    html,
    text: plainText,
    messageId,
    // Envelope sender for proper bounce handling
    envelope: {
      from: emailUser,
      to,
    },
    headers: {
      "X-Priority": "3",          // Normal priority (1=high can trigger spam filters)
      "X-Mailer": "Tecnoprism HR Portal",
      "Reply-To": emailUser,
      "X-Auto-Response-Suppress": "OOF, DR, RN, NRN, AutoReply",
      "Precedence": "bulk",
      "List-Unsubscribe": `<mailto:${emailUser}?subject=unsubscribe>`,
    },
  };

  // Attempt to send with retry (helps with transient Outlook/Exchange issues)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const info = await mailer.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to} | MessageId: ${info.messageId} | Response: ${info.response}`);
      return { success: true, sent: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Email attempt ${attempt} failed to ${to}:`, error.message);
      if (attempt === 2) {
        // Reset transporter on final failure so it reconnects next time
        transporter = null;
        return { success: false, error: error.message };
      }
      // Wait 2s before retry
      await new Promise((r) => setTimeout(r, 2000));
      // Reset transporter and try fresh connection
      transporter = null;
      const freshMailer = await getTransporter();
      if (!freshMailer) return { success: false, error: "Transporter unavailable on retry" };
    }
  }
}
