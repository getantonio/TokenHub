contract TokenFactory {
    address public platformTeamWallet;
    uint256 public platformTeamAllocation;

    struct TokenParams {
        // ... existing parameters ...
        uint256 platformTeamAllocation;
        address platformTeamWallet;
    }

    function createToken(TokenParams memory params) external payable {
        // ... existing token creation logic ...

        // Handle platform team allocation for mainnet
        if (params.platformTeamAllocation > 0 && params.platformTeamWallet != address(0)) {
            // Transfer platform team tokens
            uint256 platformTokens = (totalSupply * params.platformTeamAllocation) / 100;
            _mint(params.platformTeamWallet, platformTokens);
            
            // Apply vesting to platform team tokens (optional)
            _applyVesting(params.platformTeamWallet, platformTokens, 12, 3); // 12 months vesting, 3 months cliff
        }

        // ... rest of the token creation logic ...
    }
} 