#!/bin/bash

# Function to check if script has changed
check_script_update() {
  local SCRIPT_HASH_BEFORE=$1
  local SCRIPT_HASH_AFTER=$(md5sum $0 | awk '{ print $1 }')

  if [ "$SCRIPT_HASH_BEFORE" != "$SCRIPT_HASH_AFTER" ]; then
      echo "Update script modified. Re-executing the updated script."
      exec $0
      exit 0
  fi
}

# Exit immediately if a command exits with a non-zero status
set -e
set -o pipefail

# Capture initial script hash
SCRIPT_HASH=$(md5sum $0 | awk '{ print $1 }')

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

# Check if the script has been updated during the pull
check_script_update $SCRIPT_HASH

# Step 2: Reinstall dependencies
print_message "Reinstalling dependencies..."
npm install

# Step 3: Rebuild the project
print_message "Rebuilding the project..."
npm run build

# Step 4: Restart PM2 services
print_message "Restarting PM2 services..."
pm2 restart 6529PreNode --update-env
pm2 restart 6529PreNode-api --update-env

print_message "Update completed successfully!"