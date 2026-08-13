import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import type { UserMailer } from '../../application/ports/user-mailer.port';

@Injectable()
export class NodemailerUserMailer implements UserMailer {
  private readonly logger = new Logger(NodemailerUserMailer.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from = config.get<string>('MAIL_FROM', 'no-reply@magnum-opus.local');
    this.transporter = config.get<boolean>('MAIL_ENABLED', false)
      ? nodemailer.createTransport({
          host: config.get<string>('MAIL_HOST', 'localhost'),
          port: Number(config.get<number>('MAIL_PORT', 1025)),
          secure: false,
          tls: { rejectUnauthorized: false },
        })
      : null;
  }

  public async sendWelcome(email: string): Promise<boolean> {
    if (!this.transporter) return this.skipped('Welcome', email);

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Chào mừng thành viên mới - Magnum Opus',
      html: `
                    <div style="background-color: #09090b; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px border #27272a;">
                        <h2 style="color: #3b82f6; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 16px;">Chào mừng tới Magnum Opus! 🎉</h2>
                        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">Tài khoản của bạn với email <strong>${email}</strong> đã được khởi tạo thành công trên hệ thống quản trị.</p>
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid #27272a; padding: 20px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0; font-size: 13px; color: #e4e4e7;">Bây giờ bạn đã có quyền truy cập vào bảng quản trị và quản lý các tài nguyên hệ thống.</p>
                        </div>
                        <p style="font-size: 12px; color: #71717a; margin-top: 32px; border-top: 1px solid #27272a; padding-top: 16px;">Đây là email tự động từ hệ thống. Vui lòng không trả lời thư này.</p>
                    </div>
                `,
    });
    this.logger.log(`[Worker] Welcome email successfully sent to ${email}.`);
    return true;
  }

  public async sendDeactivation(email: string): Promise<boolean> {
    if (!this.transporter) return this.skipped('Deactivation', email);

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Thông báo: Tài khoản của bạn đã bị khóa',
      html: `
                    <div style="background-color: #09090b; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #ef4444;">
                        <h2 style="color: #ef4444; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 16px;">Cảnh báo bảo mật: Tài khoản bị vô hiệu hóa ⚠️</h2>
                        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">Tài khoản <strong>${email}</strong> của bạn đã bị tạm khóa bởi quản trị viên hệ thống.</p>
                        <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid #ef4444; padding: 20px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0; font-size: 13px; color: #fecaca; line-height: 1.5;">Toàn bộ các phiên hoạt động (active sessions) của bạn đã bị thu hồi. Bạn sẽ không thể đăng nhập hoặc thao tác cho tới khi tài khoản được mở khóa.</p>
                        </div>
                        <p style="font-size: 14px; color: #a1a1aa;">Nếu cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ kỹ thuật.</p>
                        <p style="font-size: 12px; color: #71717a; margin-top: 32px; border-top: 1px solid #27272a; padding-top: 16px;">Đây là email tự động từ hệ thống. Vui lòng không trả lời thư này.</p>
                    </div>
                `,
    });
    this.logger.log(`[Worker] Deactivation email sent to ${email}.`);
    return true;
  }

  public async sendPasswordReset(
    email: string,
    resetUrl: string,
  ): Promise<boolean> {
    if (!this.transporter) return this.skipped('Password reset', email);

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Đặt lại mật khẩu',
      text: `Mở liên kết này để đặt lại mật khẩu. Liên kết hết hạn sau 30 phút và chỉ dùng được một lần: ${resetUrl}`,
      html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu.</p><p><a href="${escapeAttribute(resetUrl)}">Đặt lại mật khẩu</a></p><p>Liên kết hết hạn sau 30 phút và chỉ dùng được một lần. Nếu bạn không gửi yêu cầu này, hãy bỏ qua email.</p>`,
    });
    this.logger.log(`[Worker] Password reset email sent to ${email}.`);
    return true;
  }

  public async sendEmailVerification(
    email: string,
    verificationUrl: string,
  ): Promise<boolean> {
    if (!this.transporter) return this.skipped('Email verification', email);

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Xác minh địa chỉ email',
      text: `Mở liên kết này để xác minh email. Liên kết hết hạn sau 24 giờ và chỉ dùng được một lần: ${verificationUrl}`,
      html: `<p>Hãy xác minh địa chỉ email để hoàn tất đăng ký.</p><p><a href="${escapeAttribute(verificationUrl)}">Xác minh email</a></p><p>Liên kết hết hạn sau 24 giờ và chỉ dùng được một lần.</p>`,
    });
    this.logger.log(`[Worker] Email verification sent to ${email}.`);
    return true;
  }

  private skipped(kind: string, email: string): false {
    this.logger.log(
      `[Worker] ${kind} email skipped for ${email}: MAIL_ENABLED=false`,
    );
    return false;
  }
}

const escapeAttribute = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
