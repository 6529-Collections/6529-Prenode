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

# Step 1: Start Prenode
print_message "Starting Prenode with PM2..."
pm2 start npm --name=6529Prenode -- run prenode

# Step 2: Start API
print_message "Starting API with PM2 on port 3000..."
pm2 start npm --name=6529Prenode-api -- run api
pm2 save

print_message "Prenode and API are now running!"
