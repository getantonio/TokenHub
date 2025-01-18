// Documentation URLs
export const DOC_PATHS = {
  FEE_STRUCTURE: '/logs/docs/FEE_STRUCTURE.md',
  LOCAL_TESTNET: '/logs/docs/LOCAL_TESTNET.md',
  SMART_CONTRACTS: '/logs/contracts/smart-contracts.md',
  UI_COMPONENTS: '/logs/components/ui-components.md',
} as const;

// For external links
export const DOCS_BASE_URL = process.env.NEXT_PUBLIC_DOCS_URL || '';

// Export the full URL for fee structure
export const FEE_STRUCTURE_DOC_URL = `${DOCS_BASE_URL}${DOC_PATHS.FEE_STRUCTURE}`; 