import { ConfigService } from '@nestjs/config';

import { NodemailerUserMailer } from './nodemailer-user-mailer';

describe('NodemailerUserMailer', () => {
  it('reports an explicit skip for every mail type when mail is disabled', async () => {
    const mailer = new NodemailerUserMailer(
      new ConfigService({ MAIL_ENABLED: false }),
    );

    await expect(mailer.sendWelcome('member@example.com')).resolves.toBe(false);
    await expect(mailer.sendDeactivation('member@example.com')).resolves.toBe(
      false,
    );
    await expect(
      mailer.sendPasswordReset('member@example.com', 'https://reset.example'),
    ).resolves.toBe(false);
    await expect(
      mailer.sendEmailVerification(
        'member@example.com',
        'https://verify.example',
      ),
    ).resolves.toBe(false);
  });
});
