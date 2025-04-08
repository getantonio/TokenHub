import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';

interface TokenURIGeneratorProps {
  tokenName?: string;
  tokenSymbol?: string;
  onURIGenerated: (uri: string) => void;
}

export function TokenURIGenerator({ tokenName = '', tokenSymbol = '', onURIGenerated }: TokenURIGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedURI, setGeneratedURI] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: tokenName,
    symbol: tokenSymbol,
    description: '',
    image: '',
    externalLink: '',
    attributes: [] as { trait_type: string; value: string }[]
  });
  const [newTraitName, setNewTraitName] = useState('');
  const [newTraitValue, setNewTraitValue] = useState('');
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addAttribute = () => {
    if (!newTraitName || !newTraitValue) return;
    
    setFormData(prev => ({
      ...prev,
      attributes: [
        ...prev.attributes,
        { trait_type: newTraitName, value: newTraitValue }
      ]
    }));
    
    setNewTraitName('');
    setNewTraitValue('');
  };

  const removeAttribute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }));
  };

  const generateTokenURI = async () => {
    try {
      setIsGenerating(true);
      
      // Create metadata object
      const metadata = {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        image: formData.image,
        external_link: formData.externalLink,
        attributes: formData.attributes
      };
      
      // Convert to Base64 encoded JSON
      const jsonString = JSON.stringify(metadata);
      const base64Encoded = btoa(unescape(encodeURIComponent(jsonString)));
      
      // Create a data URI
      const dataUri = `data:application/json;base64,${base64Encoded}`;
      
      // Wait a moment to simulate processing
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setGeneratedURI(dataUri);
      toast({
        title: "Metadata Generated",
        description: "Your token metadata has been generated as a data URI."
      });
      
      // Pass URI back to parent component
      onURIGenerated(dataUri);
    } catch (error) {
      console.error("Error generating token URI:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate token metadata URI."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const closeWithURI = () => {
    if (generatedURI) {
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          type="button"
          variant="secondary" 
          className="mt-1 w-full text-xs"
        >
          Generate Token URI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Token Metadata Generator</DialogTitle>
          <DialogDescription>
            Create metadata for your token that includes details and attributes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Token Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., My Token"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol" className="text-white">Token Symbol</Label>
              <Input
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleInputChange}
                placeholder="e.g., MTK"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description</Label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your token..."
              className={cn(
                "bg-gray-800 border-gray-700 text-white min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus:outline-none",
                "focus:ring-1 focus:ring-gray-600 resize-none"
              )}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image" className="text-white">Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="image"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                placeholder="https://example.com/token-image.png"
                className="bg-gray-800 border-gray-700 text-white flex-grow"
              />
              <a 
                href="https://imgur.com/upload" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded px-3 py-1 text-xs transition-colors"
              >
                Upload to Imgur
              </a>
            </div>
            <p className="text-xs text-gray-400">Direct link to an image representing your token</p>
            <p className="text-xs text-gray-400 mt-1">
              <span className="font-semibold text-gray-300">Imgur tip:</span> After uploading, right-click the image and select "Copy image address" to get a direct URL.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="externalLink" className="text-white">External Link (Optional)</Label>
            <Input
              id="externalLink"
              name="externalLink"
              value={formData.externalLink}
              onChange={handleInputChange}
              placeholder="https://yourwebsite.com"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          
          <div className="border-t border-gray-800 pt-4">
            <Label className="text-white mb-2 block">Attributes/Traits (Optional)</Label>
            
            <div className="grid grid-cols-5 gap-2 mb-2">
              <div className="col-span-2">
                <Input
                  value={newTraitName}
                  onChange={(e) => setNewTraitName(e.target.value)}
                  placeholder="Trait name"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={newTraitValue}
                  onChange={(e) => setNewTraitValue(e.target.value)}
                  placeholder="Value"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={addAttribute}
                className="h-9 w-9"
              >
                +
              </Button>
            </div>
            
            {formData.attributes.length > 0 && (
              <div className="bg-gray-800 rounded-md p-2 mt-2">
                <p className="text-xs text-gray-400 mb-2">Added Attributes:</p>
                {formData.attributes.map((attr, index) => (
                  <div key={index} className="flex justify-between items-center mb-1 text-white bg-gray-700 rounded px-2 py-1">
                    <span className="text-sm">{attr.trait_type}: {attr.value}</span>
                    <Button 
                      variant="ghost" 
                      onClick={() => removeAttribute(index)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {generatedURI && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-600/30 rounded-md">
              <p className="text-green-400 font-medium text-sm">Metadata URI Generated:</p>
              <p className="font-mono text-xs text-green-300 break-all mt-1">{generatedURI.substring(0, 64)}...</p>
              <div className="mt-3 border-t border-green-600/30 pt-2">
                <p className="text-xs text-gray-400 mb-2">Preview of your token metadata:</p>
                <div className="bg-gray-800 rounded p-2 text-xs">
                  <pre className="text-gray-300 overflow-auto max-h-[100px]">
                    {JSON.stringify({
                      name: formData.name,
                      symbol: formData.symbol,
                      description: formData.description.substring(0, 50) + (formData.description.length > 50 ? '...' : ''),
                      image: formData.image,
                      attributes: formData.attributes.length > 0 ? 
                        `${formData.attributes.length} trait${formData.attributes.length === 1 ? '' : 's'}` : 'none'
                    }, null, 2)}
                  </pre>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">This URI has been added to your token form.</p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {!generatedURI ? (
            <Button 
              type="button" 
              onClick={generateTokenURI} 
              disabled={isGenerating || !formData.name || !formData.symbol} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? <Spinner /> : 'Generate Metadata URI'}
            </Button>
          ) : (
            <Button type="button" onClick={closeWithURI} className="bg-green-600 hover:bg-green-700">
              Use This URI
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 