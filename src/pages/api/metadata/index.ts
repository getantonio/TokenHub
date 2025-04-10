import { NextApiRequest, NextApiResponse } from 'next';

// In a production app, you'd store this in a database
const metadataStorage: Record<string, any> = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      let metadata = req.body;
      
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON in request body' });
        }
      }
      
      if (!metadata.name || !metadata.symbol) {
        return res.status(400).json({ error: 'Name and symbol are required' });
      }
      
      // Generate a unique ID
      const timestamp = Date.now();
      const metadataId = `${metadata.symbol.toLowerCase()}-${timestamp}`;
      
      // Store the metadata
      metadataStorage[metadataId] = {
        ...metadata,
        created_at: new Date().toISOString()
      };
      
      // In a real app, you would store this in a database
      console.log(`[API] Created metadata for ${metadataId}`);
      
      // Return the URI that can be used to access this metadata
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || `https://${req.headers.host}`;
      const uri = `${baseUrl}/api/metadata/${metadataId}`;
      
      return res.status(201).json({ 
        success: true, 
        id: metadataId,
        uri
      });
    } catch (error) {
      console.error('[API] Error creating metadata:', error);
      return res.status(500).json({ error: 'Failed to create metadata' });
    }
  } else {
    // Method not allowed
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
} 