import { Mailchain } from '@mailchain/sdk';

class MailchainService {
  private static instance: MailchainService;
  private mailchain: Mailchain | null = null;

  private constructor() {}

  public static getInstance(): MailchainService {
    if (!MailchainService.instance) {
      MailchainService.instance = new MailchainService();
    }
    return MailchainService.instance;
  }

  private async initializeMailchain() {
    if (!this.mailchain) {
      this.mailchain = await Mailchain.fromWallet();
    }
    return this.mailchain;
  }

  public async sendVerificationCode(email: string, code: string): Promise<void> {
    const mailchain = await this.initializeMailchain();
    await mailchain.sendMail({
      from: process.env.NEXT_PUBLIC_MAILCHAIN_ADDRESS!,
      to: [email],
      subject: 'TokenHub Email Verification',
      content: {
        text: `Your verification code is: ${code}`,
        html: `
          <h2>TokenHub Email Verification</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 10 minutes.</p>
        `
      }
    });
  }

  public async sendDeploymentNotification(
    email: string,
    tokenAddress: string,
    tokenName: string,
    network: string,
    explorerUrl: string
  ): Promise<void> {
    const mailchain = await this.initializeMailchain();
    await mailchain.sendMail({
      from: process.env.NEXT_PUBLIC_MAILCHAIN_ADDRESS!,
      to: [email],
      subject: `Token ${tokenName} Deployed Successfully`,
      content: {
        text: `
          Your token has been deployed successfully!
          
          Token: ${tokenName}
          Address: ${tokenAddress}
          Network: ${network}
          Explorer: ${explorerUrl}
        `,
        html: `
          <h2>Token Deployed Successfully! 🎉</h2>
          <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 5px;">
            <p><strong>Token Name:</strong> ${tokenName}</p>
            <p><strong>Token Address:</strong> ${tokenAddress}</p>
            <p><strong>Network:</strong> ${network}</p>
            <p><a href="${explorerUrl}" style="color: #0066cc;">View on Explorer</a></p>
          </div>
          <p>Thank you for using TokenHub!</p>
        `
      }
    });
  }
}

export const mailchainService = MailchainService.getInstance(); 