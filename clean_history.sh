#!/bin/bash

# Create a backup branch
git checkout -b backup_before_clean

# Remove sensitive data from all commits
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch \
.env \
.env.local \
.env.* \
*.pem \
*.key \
**/private_key* \
**/PRIVATE_KEY* \
**/secret* \
**/SECRET* \
**/api_key* \
**/API_KEY* \
**/infura_key* \
**/INFURA_KEY* \
**/alchemy_key* \
**/ALCHEMY_KEY* \
**/firebase_key* \
**/FIREBASE_KEY* \
**/chainstack_key* \
**/CHAINSTACK_KEY* \
**/bscscan_key* \
**/BSCSCAN_KEY* \
**/etherscan_key* \
**/ETHERSCAN_KEY* \
**/polygonscan_key* \
**/POLYGONSCAN_KEY* \
**/arbitrum_key* \
**/ARBITRUM_KEY* \
**/optimism_key* \
**/OPTIMISM_KEY*' \
--prune-empty --tag-name-filter cat -- --all

# Force push the changes to remove sensitive data from remote
git push origin --force --all
git push origin --force --tags

# Clean up the local repository
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "Git history has been cleaned. Please verify the changes and update any exposed credentials." 