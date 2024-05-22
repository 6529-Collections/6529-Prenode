#!/bin/bash

# Download and install tools and config for this 6529 PreNode instance
# eg: ec2-setup.sh ADMIN_EMAIL PRENODE_DOMAIN

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

# Step 2: Install NPM
print_message "Installing npm..."
sudo apt update
sudo apt install -y npm

# Step 3: Install n and switch to npm version 21
print_message "Installing 'n' and setting npm version to 21..."
sudo npm install -g n
sudo n 21

# Reset session
hash -r

# Step 4: Install source and dependencies
print_message "Installing dependencies..."
cd ~
git clone  --branch main https://github.com/6529-Collections/6529-PreNode.git 
cd 6529-PreNode
npm install

# Step 5: Build the project
print_message "Building the project..."
npm run build

# Step 6: Install PM2
print_message "Installing PM2..."
sudo npm install -g pm2@latest

# Step 7: Configure PM2 to auto-restart on system reboot
print_message "Configuring PM2 to auto-restart on system reboot..."
pm2 startup

# Step 8: Set up PM2 log rotation
print_message "Setting up PM2 log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD
pm2 set pm2-logrotate:rotateModule true

print_message "All steps completed successfully!"
