// Documentation URLs
export const DOC_PATHS = {
  FEE_STRUCTURE: '/docs/FEE_STRUCTURE',
  LOCAL_TESTNET: '/docs/LOCAL_TESTNET',
  SMART_CONTRACTS: '/docs/SMART_CONTRACTS',
  UI_COMPONENTS: '/docs/UI_COMPONENTS',
} as const;

// For external links
export const DOCS_BASE_URL = process.env.NEXT_PUBLIC_DOCS_URL || '';

// Export the full URL for fee structure
export const FEE_STRUCTURE_DOC_URL = DOC_PATHS.FEE_STRUCTURE; 