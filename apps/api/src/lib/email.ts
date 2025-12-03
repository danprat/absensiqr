import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email service using Resend API
 * Includes retry logic and error handling
 */
export class EmailService {
  private resend: Resend;
  private fromEmail: string;
  private maxRetries: number;

  constructor(apiKey: string, fromEmail: string = 'AbsensiQR <noreply@absensiqr.com>', maxRetries: number = 3) {
    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
    this.maxRetries = maxRetries;
  }

  /**
   * Send email with retry logic
   */
  async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.resend.emails.send({
          from: options.from || this.fromEmail,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        return {
          success: true,
          messageId: result.data?.id,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Email send attempt ${attempt} failed:`, error);

        // Don't retry on final attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
    };
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create email service instance
 * @param apiKey - Resend API key
 * @param fromEmail - Default sender email address
 */
export function createEmailService(apiKey: string, fromEmail?: string): EmailService {
  return new EmailService(apiKey, fromEmail);
}
