import { NextApiRequest, NextApiResponse } from 'next';

// In a production app, you'd store this in a database
const metadataStorage: Record<string, any> = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (req.method === 'GET') {
    // Retrieve metadata
    const metadata = metadataStorage[id as string];
    
    if (!metadata) {
      return res.status(404).json({ error: 'Metadata not found' });
    }
    
    // Return the metadata with proper headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    return res.status(200).json(metadata);
  } 
  else if (req.method === 'POST') {
    // Store new metadata (in a real app, validate authorization)
    try {
      const metadata = JSON.parse(req.body);
      
      if (!metadata.name || !metadata.symbol) {
        return res.status(400).json({ error: 'Name and symbol are required' });
      }
      
      // Generate a unique ID if not provided
      const metadataId = id as string || `${metadata.symbol.toLowerCase()}-${Date.now()}`;
      
      // Store the metadata
      metadataStorage[metadataId] = {
        ...metadata,
        created_at: new Date().toISOString()
      };
      
      return res.status(201).json({ 
        success: true, 
        id: metadataId,
        uri: `${process.env.NEXT_PUBLIC_API_URL || 'https://tokenhub.dev'}/api/metadata/${metadataId}`
      });
    } catch (error) {
      console.error('Error storing metadata:', error);
      return res.status(400).json({ error: 'Invalid metadata format' });
    }
  } 
  else {
    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
} 