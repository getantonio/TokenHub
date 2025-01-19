import type { NextApiRequest, NextApiResponse } from 'next';

type ProtocolResponse = {
  protocol: string;
  commands: {
    [key: string]: string;
  };
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProtocolResponse>
) {
  res.status(200).json({
    protocol: 'tokenhub',
    commands: {
      'start-testnet': 'npm run local-testnet'
    }
  });
} 