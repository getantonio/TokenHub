declare module '@mailchain/sdk' {
  export class Mailchain {
    static fromWallet(): Promise<Mailchain>;
    static fromSecretRecoveryPhrase(phrase: string): Mailchain;
    
    sendMail(params: {
      from: string;
      to: string[];
      subject: string;
      content: {
        text: string;
        html: string;
      };
    }): Promise<void>;
  }
} 