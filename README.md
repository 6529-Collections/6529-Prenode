# 6529 Prenode

## Table of Contents

1. [Infrastructure](#1-infrastructure)

2. [AWS Setup](#2-aws-setup)

3. [Manual Configuration](#3-manual-configuration)

4. [Updates](#4-updates)

## 1. Infrastructure

The 6529 Prenode is a service that provides a RESTful API for querying TDH data from the 6529 Collections smart contracts. It is the same logic used on seize.io, but provides a way to query data from the blockchain without needing to visit a centralized web page.

To run the prenode, you'll need a domain name, a database, a server configured with SSL, the open-source TDH code, and some configuration.

Since the setup of all these things can be a little tricky, we've provided a CloudFormation script that will automate much of the setup process for you, directly in your own AWS account. This script will create the required EC2 instance, RDS instance, and a Route 53 domain, and configure them all to work together in a standalone VPC environment (and no, you don't need to know what all that means to get it going). All told, this configuration should run for less than $20 / month.

If you want to run the Prenode in a diffrent context, you probably know what you are doing, and can use the automated scripts provided here to work out how to proceed.

The Prenode endpoints are documented with OpenAPI Definitions, and published from the repo: [https://6529-collections.github.io/6529-Prenode/docs].

## 2. AWS Setup

You'll need just a few things in place before starting the automated setup process.

**Prerequisites:**

- You need an AWS account, of course! If you don't have one, you can create one for free, but will be required to register a payment method. You'll also need just a little familiarity with using the AWS console (<a href="https://aws.amazon.com/" target="_blank" rel="noreferrer">Sign in now</a>) or the AWS CLI (<a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html" target="_blank" rel="noreferrer">Read More</a>)

- Since the node is required to run securely over HTTPS, you'll need a domain name for an SSL certificate. The automated setup process will then get a free cert for you.

- The Prenode is querying data directly from the blockchain, so you'll need an Alchemy API key. You can get one for free by visiting the <a href="https://docs.alchemy.com/docs/alchemy-quickstart-guide" target="_blank" rel="noreferrer">Alchemy quick-start guide</a>.

### 2.1 Configure AWS CLI

Sign in to your AWS account, create the IAM role you want to use, and generate a new Access Key.

Set up your command line interface with a profile that uses this access key, secret access key, and your default region:

```bash
aws configure --profile 6529Prenode
```

You can run this again if you ever need to update any of these settings.

### 2.2 Generate a key pair

```bash
aws ec2 create-key-pair --key-name 6529PrenodeKey --query 'KeyMaterial' --output text > ~/.ssh/6529PrenodeKey.pem --profile 6529Prenode
```

### 2.3 Get a domain name

Your node will require SSL, and therefore a domain name. You will need to provide this domain name in the next step.

The automated CloudFormation setup process will configure the domain name for you, if you have a domain registered in Route 53.

So, before you proceed to the next step, go get a new domain name, or transfer an existing one to Route 53. You can do this by visiting the <a href="https://console.aws.amazon.com/route53/home" target="_blank" rel="noreferrer">Route 53 console</a>.

In addition to the domain name, you will need the Hosted Zone ID for the domain. You can find this by selecting the domain, and copying the Hosted Zone ID from the right-hand side of the page.

### 2.4 Create the CloudFormation Stack

Find an Ubuntu AMI ID for your region you will deploy in. You can find the AMI ID for your region by visiting the <a href="https://cloud-images.ubuntu.com/locator/ec2/" target="_blank" rel="noreferrer">Ubuntu Cloud Image Locator</a>. Use the filters at the bottom of the table to select your preferred region, and the latest version of Ubuntu, and be sure it is `amd64` (to work with the instance type the script uses).

If you are familiar with the AWS web-based console, you can build the stack by visiting the <a href="https://console.aws.amazon.com/cloudformation/home" target="_blank" rel="noreferrer">CloudFormation console</a>, and uploading the script `./scripts/aws-bootstrap.yaml`.

Or, you can run the following commands to create the stack and verify it from your command line.

Set these values in your local environment to make calling the CloudFormation script easier. You'll only need them once, to fire off the CloudFormation script from your command line. Copy the below into a file (with updated values) and `source` it to set the values in your environment, or copy them one at a time (modifying the values) directly into your terminal.

Replace the `YOUR-*` values with what your stack should use:

```bash
export PRENODE_DOMAIN=YOUR-DOMAIN-NAME;
export PRENODE_HOSTED_ZONE_ID=YOUR-ROUTE53_HOSTED_ZONE_ID;
export PRENODE_EMAIL=YOUR-EMAIL;
export PRENODE_AMI_ID=YOUR-AMI-ID;
export PRENODE_DB_PASSWORD=YOUR-MADEUP-SECURE-RDS-PASSWORD;
export PRENODE_KEY_NAME=YOUR-AWS-SSH-KEY-NAME;
export ALCHEMY_API_KEY=YOUR-ALCHEMY-API-KEY;
```

Run the following command to create the CloudFormation stack:

```bash
aws cloudformation create-stack \
  --stack-name Prenode6529 \
  --template-body "$(curl -L https://raw.githubusercontent.com/6529-Collections/6529-Prenode/HEAD/scripts/aws-bootstrap.yaml)" \
  --parameters ParameterKey=DomainName,ParameterValue=$PRENODE_DOMAIN \
               ParameterKey=AdminEmail,ParameterValue=$PRENODE_EMAIL \
               ParameterKey=AMIId,ParameterValue=$PRENODE_AMI_ID \
               ParameterKey=MasterUserPassword,ParameterValue=$PRENODE_DB_PASSWORD \
               ParameterKey=KeyName,ParameterValue=$PRENODE_KEY_NAME \
               ParameterKey=HostedZoneId,ParameterValue=$PRENODE_HOSTED_ZONE_ID \
               ParameterKey=AlchemyAPIKey,ParameterValue=$ALCHEMY_API_KEY \
  --profile 6529Prenode
```

Note: this command is expecting that you have properly set the environment variables in the previous step.

Give it a few moments to create the stack. And you are basically done! The next steps here are just to verify that everything is working as expected.

That's You can check the status of the stack by running:

```bash
aws cloudformation describe-stacks --stack-name Prenode6529 --profile 6529Prenode
```

### 2.5 Get the public IP address

Once the stack is created, you can hold the public IP address of your EC2 instance in an env var by running:

```bash
export PRENODE_IP=`aws cloudformation describe-stacks --stack-name Prenode6529 --query "Stacks[0].Outputs[?OutputKey=='ElasticIPAddress'].OutputValue" --output text --profile 6529Prenode`; echo $PRENODE_IP;
```

Now you can SSH into your EC2 instance, if you want to check the configuration:

```bash
ssh -i ~/.ssh/6529PrenodeKey.pem ubuntu@$PRENODE_IP
```

Source code can be found in `~/6529-Prenode`. You can find logs in `~/.pm2/logs`.

### 2.6 Verify

Once the CloudFormation stack has completed building out all resources, verify it is working by navigating to the domain name you provided in the CloudFormation script:

```bash
https://YOUR.DOMAIN.NAME/oracle/address/0xADDRESS
```

Compare the response with

```bash
https://api.seize.io/oracle/address/0xADDRESS
```

## 3. Manual configuration

If you'd like to run the 6529 Prenode in any other context (Advanced), you can manually configure it using the following steps.

DO NOT PROCEED if your AWS setup is complete.

### 3.1 Get the code

Clone repository "6529-Prenode" at branch `main`

```bash
git clone --branch main https://github.com/6529-Collections/6529-Prenode.git
```

then change directory to the repository

```bash
cd 6529-Prenode/
```

```bash
scripts/setup.sh # Install dependencies, configure pm2, turn on log rotations
```

To run the project you need a file to hold environment variable. The following script with run you through the process of creating this file.

**Note:**

- you will be asked to provide database credentials

  - host
  - port
  - admin user and password (used to create database and new users for the services but not saved in .env file)
  - new database user/password

- you will be asked to provide Alchemy API key (get one <a href="https://docs.alchemy.com/docs/alchemy-quickstart-guide" target="_blank" rel="noreferrer">here</a>)

- at the end of this process:
  - new database created
  - new read and write users created
  - database tables created (empty)
  - a new file will be created `.env.prenode`

```bash
npm run set_env
```

<a href="https://github.com/6529-Collections/6529-Prenode/blob/main/.env.sample" target="_blank" rel="noreferrer">Sample .env file</a>

## 3.2 Initialize DB

The database expects some initial data. Choose to load EITHER from latest snapshot or directly.

## 3.2.1 Restore Snapshot

The best option is usually to restore a recent seize.io snapshot.

Populate your prenode database from the latest snapshot using the following

```bash
npm run restore
```

## 3.2.2 Direct Load

DO NOT PROCEED if you have already restored from a snapshot. No need, you've got the data.

If you'd like to load data directly from the chain, you can do so by following the steps below.

Two main components need to be loaded directly: NFTDelegation data and Transaction data.

Run the following to restore data from NFTDelegation contract

```bash
npm run direct_load_nftd
```

Run the following to restore transaction data

```bash
npm run direct_load_trx
```

## 3.3 Run Services

To ensure your application starts on system boot, you can use PM2’s startup script generator. Run the following command and follow the instructions provided:

```bash
pm2 startup
```

## 3.4 Set Up Log Rotation

PM2 can also manage log rotation, which is critical for ensuring that logs do not consume all available disk space.

### 3.5 Manual Start

#### 3.5.1 Run Prenode

- PM2 process name: 6529Prenode

```bash
pm2 start npm --name=6529Prenode -- run prenode
```

- **CRON:** When starting the service, there are several scheduled cron jobs running at specific intervals which will consume data from the chain, process and save the result to the database.
  e.g. discovering Transactions - there is a scheduled cron job to run every 2 minutes which detects new transactions on the chain and saves them in the database

- **Note:** On start, this service will always run the tdh calculation on start and the schedule it to run at 00:00 UTC

#### 3.5.2 Run API

- PM2 process name: 6529Prenode-api
- PORT: 3000

```bash
pm2 start npm --name=6529Prenode-api -- run api
```

**Note:** To ensure PM2 knows which processes to restart at boot, you need to save the list after starting the services

```bash
pm2 save
```

### 3.6 Scripted Start

```bash
scripts/start.sh
```

### 3.7 Verify

### 3.7.1 Local

To test your api locally, navigate in your browser to:

```bash
http://localhost:3000/oracle/address/0xADDRESS
```

### 3.7.2 Production

Once you have completed the above steps on your production server, you'll also need to ensure that your domain is pointing to the server's IP address, and is correctly configured for SSL.

SSL traffic on port 443 will need be routed to port 3000 to reach the API server. Use the approach appropriate for your server to configure this.

Config for nginx might look like:

```nginx
server {
    listen 443 ssl;
    server_name YOUR-DOMAIN-NAME;

   #... SSL configuration

   location / {
      proxy_pass http://localhost:3000;
   }
}
```

When this is all working, you can finaly navigate to

```bash
https://YOUR-DOMAIN-NAME/oracle/address/0xADDRESS
```

Compare the response with

```bash
https://api.seize.io/oracle/address/0xADDRESS
```

## 4 Updates

Get the latest Prenode source code by updating the repository.

Choose between [4.1 Manual Update](#41-manual-update) or [4.2 Scripted Update](#42-scripted-update)

### 4.1 Manual Update

#### 4.1.1 Pull new changes

```bash
git pull
```

#### 4.1.2 Re-Install

```bash
npm i
```

#### 4.1.3 Re-Build

```bash
npm run build
```

#### 4.1.4 Restart Prenode and API

```bash
pm2 restart 6529Prenode
pm2 restart 6529Prenode-api
```

### 4.2 Scripted Update

```bash
scripts/update.sh
```
