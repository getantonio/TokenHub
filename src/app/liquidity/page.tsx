export const dynamic = 'force-static';

export default function LiquidityPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>Add Liquidity</h1>
      <p style={{ textAlign: 'center', marginBottom: '2rem' }}>This feature is temporarily unavailable</p>
      
      <div style={{ 
        backgroundColor: '#1F2937',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Feature Temporarily Disabled</h2>
        <p style={{ marginBottom: '1rem' }}>
          Our liquidity management feature is temporarily disabled while we update our web3 integration.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          We're addressing compatibility issues with our blockchain connectivity layer.
          Please check back later for updates.
        </p>
        <div style={{ textAlign: 'center' }}>
          <a 
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              backgroundColor: '#3B82F6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.25rem',
              fontWeight: 'bold'
            }}
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
} 