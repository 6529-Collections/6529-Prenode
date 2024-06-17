#!/bin/bash

# Function to check if script has changed
check_script_update() {
  local SCRIPT_HASH_BEFORE=$1
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    local SCRIPT_HASH_AFTER=$(md5 -q $0)
  else
    local SCRIPT_HASH_AFTER=$(md5sum $0 | awk '{ print $1 }')
  fi

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
if [[ "$OSTYPE" == "darwin"* ]]; then
  SCRIPT_HASH=$(md5 -q $0)
else
  SCRIPT_HASH=$(md5sum $0 | awk '{ print $1 }')
fi

# Function to print messages
print_message() {
  echo
  echo "================================================================"
  echo "$1"
  echo "================================================================"
  echo
}

NO_RESTORE=false
if [ "$1" == "--no-restore" ]; then
  NO_RESTORE=true
fi

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

# Step 4: Restore
if [ "$NO_RESTORE" = false ]; then
  print_message "Restoring..."
  pm2 stop 6529Prenode
  npm run restore
else
  print_message "Restore Skipped"
fi

# Step 5: Restart PM2 services
print_message "Restarting PM2 services..."
pm2 restart 6529Prenode --update-env
pm2 restart 6529Prenode-api --update-env

print_message "Update completed successfully!"