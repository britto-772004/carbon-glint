import nodemailer from 'nodemailer';
import type { Config } from '../config.js';
import type { Logger } from './logger.js';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

/** SMTP mailer (relay on 587). Falls back to logging when SMTP_HOST is not configured. */
export function createMailer(config: Config, logger: Logger): Mailer {
  if (!config.SMTP_HOST) {
    return {
      async send(message) {
        logger.warn({ to: message.to, subject: message.subject }, 'SMTP_HOST not set — email logged, not sent');
        logger.debug({ text: message.text }, 'email body');
      },
    };
  }

  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    ...(config.SMTP_USER ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASS } } : {}),
  });

  return {
    async send(message) {
      await transport.sendMail({ from: config.MAIL_FROM, ...message });
    },
  };
}
