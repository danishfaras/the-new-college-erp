import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  // In development, just log the email
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    console.log('📧 Email would be sent:')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Body:', text || html)
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@thenewcollege.edu',
      to,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
    // Don't throw - email sending should not break the main flow
  }
}

export function getApprovalEmailTemplate(name: string): { subject: string; html: string } {
  return {
    subject: 'The New College — Your account approval',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">The New College</h2>
        <p>Dear ${name},</p>
        <p>Your account has been approved by the administrator. You can now log in to access your dashboard.</p>
        <p>
          <a href="${process.env.NEXTAUTH_URL}/login" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Log In
          </a>
        </p>
        <p>Best regards,<br>The New College Team</p>
      </div>
    `,
  }
}

export function getInvoiceEmailTemplate(
  name: string,
  invoiceId: string,
  amount: number,
  dueDate: Date
): { subject: string; html: string } {
  return {
    subject: `The New College — Invoice #${invoiceId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">The New College</h2>
        <p>Dear ${name},</p>
        <p>A new invoice has been issued for your account.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Invoice ID:</strong> ${invoiceId}</p>
          <p><strong>Amount:</strong> ₹${amount.toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
        </div>
        <p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard/fees" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Invoice
          </a>
        </p>
        <p>Best regards,<br>The New College Team</p>
      </div>
    `,
  }
}
