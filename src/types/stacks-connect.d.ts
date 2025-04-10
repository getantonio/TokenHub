declare module '@stacks/connect' {
  // Extend the request function to accept our parameters
  export function request(
    method: 'stx_deployContract',
    params: {
      name: string;
      clarityCode: string;
      clarityVersion?: string;
      postConditions?: string[];
      postConditionMode?: 'allow' | 'deny';
    }
  ): Promise<{ txid: string }>;

  // Add stx_transferStx method
  export function request(
    method: 'stx_transferStx',
    params: {
      recipient: string;
      amount: string;
      memo?: string;
    }
  ): Promise<{ txid: string; transaction?: string }>;

  // Add general user session function
  export function showConnect(options: any): void;
  export function isConnected(): boolean;
  export function disconnect(): void;
  export class UserSession {
    constructor(options: any);
    isUserSignedIn(): boolean;
    loadUserData(): any;
    signUserOut(redirectUrl?: string): void;
  }
  export class AppConfig {
    constructor(scopes: string[]);
  }
} 