#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e
set -o pipefail

# Function to print messages
print_message() {
  echo
  echo "================================================================"
  echo "$1"
  echo "================================================================"
  echo
}

# Step 1: Pull the latest changes from the specified branch
print_message "Pulling the latest changes from the branch $BRANCH..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# Step 2: Reinstall dependencies
print_message "Reinstalling dependencies..."
npm install

# Step 3: Rebuild the project
print_message "Rebuilding the project..."
npm run build

# Step 4: Restart PM2 services
print_message "Restarting PM2 services..."
pm2 restart 6529Prenode
pm2 restart 6529Prenode-api

print_message "Update completed successfully!"
