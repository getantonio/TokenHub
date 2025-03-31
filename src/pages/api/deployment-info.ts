import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Interface for deployment info
type DeploymentInfo = {
  network: string;
  deployer: string;
  priceOracle: string;
  interestRateModel: string;
  feeCollector: string;
  lendingPoolImpl: string;
  factory: string;
  testToken: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Path to the deployment file (adjust the path if needed)
    const deploymentPath = path.join(process.cwd(), 'deployments', 'defi-sepolia.json');
    
    // Check if the file exists
    if (!fs.existsSync(deploymentPath)) {
      return res.status(404).json({ error: 'Deployment file not found' });
    }
    
    // Read the deployment file
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8')) as DeploymentInfo;
    
    // Return the deployment info
    return res.status(200).json({
      factory: deploymentData.factory,
      message: 'Use this factory address for pool creation'
    });
  } catch (error) {
    console.error('Error reading deployment info:', error);
    return res.status(500).json({ error: 'Failed to retrieve deployment info' });
  }
} 