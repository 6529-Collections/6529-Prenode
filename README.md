# 6529 Prenode

## Table of Contents

1. [Overview](#1-infrastructure)

2. [AWS Setup](#2-aws-setup)

3. [Manual Configuration](#3-manual-configuration)

4. [Updates](#4-updates)

## 1. Overview

The 6529 Prenode decentralizes access to TDH data for 6529 Identities and 6529 NFTs.

### 1.1 Purpose

As a web service running a RESTful API, it uses the same calculation logic as the 6529 websites. Standardized setup through a provided CloudFormation script means anyone can run on their AWS account.

What is the purpose of the Prenode? There are three purposes for the Prenode:

1. Most important: The immediate use of the Prenode is to enable multiple parties to independently serve as TDH providers to the on-chain TDH oracle contract that will be launching soon™. This will allow for on-chain composable TDH that is not dependent on any single party.
1. To allow anyone to serve as an API provider of TDH information in general, in any context, onchain or offchain.
1. To serve as the first step towards 6529 Nodes that can run on any computing environment.

Some further points:

1. You should assume that there will be further updates to the Prenodes and, later, to Nodes. The Prenode name will remain until the code is restructured to run in any computer environment.
1. There are no current economic incentives to run a Prenode, but it is something that will be considered later if necessary. Our current view is that there are sufficient people with the capacity and motivation to run a Prenode that it is better not to yet commit to a crypto-economic model that may be immature or not necessary.
1. We estimate the cost of running a Prenode on AWS to be less than 0.015 ETH per month ($50 or so).
1. For now, we request that people and organizations with the economic capacity to do so to run Prenodes for the health of the network.

### 1.2 The technical details

To run the Prenode, you'll need a domain name, a database, a server configured with SSL, the open-source TDH code, and some configuration.

Since the setup of all these things can be a little tricky, we've provided a CloudFormation script that will automate much of the setup process for you, directly in your own AWS account. This script will create the required EC2 instance, RDS instance, and a Route 53 domain, and configure them all to work together in a standalone VPC environment (and no, you don't need to know what all that means to get it going). All told, this configuration should run for less than $50/month (likely less if you have free tier resources available).

A familiarity with (or strong determination to learn) the AWS console and the AWS CLI tool is required to complete the setup.

Experienced cloud computing users who want to run Prenode in a different context can use the automated scripts provided here to work out how to proceed.

The Prenode endpoints are documented with OpenAPI Definitions, and published from the repo: [https://6529-collections.github.io/6529-Prenode/docs](https://6529-collections.github.io/6529-Prenode/docs).

## 2. AWS setup

You'll need just a few things in place before starting the automated setup process.

Do not skip any steps, and do not proceed if a step doesn't complete successfully. Reach out for help if you get stuck.

**Prerequisites:**

- You need an AWS account, of course! If you don't have one, you can create one for free (but will be required to register a payment method). You'll also need familiarity with using the AWS console (<a href="https://aws.amazon.com/" target="_blank" rel="noreferrer">Sign in now</a>) and the AWS CLI (command line interface) tool (<a href="https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" target="_blank" rel="noreferrer">installation guide</a>).

- Since the node is required to run securely over HTTPS, you'll need a domain name for an SSL certificate. The automated setup process will then get a free cert for you.

- The Prenode is querying data directly from the blockchain, so you'll need an Alchemy API key. You can get one for free by visiting the <a href="https://docs.alchemy.com/docs/alchemy-quickstart-guide" target="_blank" rel="noreferrer">Alchemy quick-start guide</a>.

### 2.1 Configure AWS CLI

After some initial setup through the AWS web console, the rest of the process can be done from your computer's local CLI. You'll need to install the AWS CLI tool (see link above) and configure it to use your AWS account.

Sign in to your AWS account.

1. Select (or create) the IAM user you want to use, initially with no access policies attached. Note the ARN of this user.
1. Add a new IAM policy along the lines of the provided [IAM policy example](aws/prenode-iam-policy-example.json), making sure you scope it your new user's ARN properly.
1. 'Add permission' to attach this policy to the user.
   > NOTE: This policy grants the user full access to a number of resources. Be SURE to remove the policy when done, so the user account can't be exploited.
1. Now view the user's Security Credentials and generate a new Access Key for CLI usage.

Now, configure your local computer terminal (NOT CloudShell) with a profile that uses this access key, secret access key, and your default region:

```bash
aws configure --profile 6529Prenode
```

You can run this again if you ever need to update any of these settings.

### 2.2 Generate a key pair

To connect to the EC2 instance, you'll need to generate a key pair. As you will use this later, you can store the name of the key in an environment variable.

You can do this by running the following commands:

```bash
export PRENODE_EC2_KEY_PAIR_NAME=PrenodeEC2KeyPairName;
aws ec2 create-key-pair --key-name $PRENODE_EC2_KEY_PAIR_NAME \
  --output text > ~/.ssh/$PRENODE_EC2_KEY_PAIR_NAME.pem \
  --query 'KeyMaterial' \
  --profile 6529Prenode;
chmod 400 ~/.ssh/$PRENODE_EC2_KEY_PAIR_NAME.pem;
```

### 2.3 Domain ownership

#### 2.3.1 Get a domain name

Your node will require SSL, and therefore a domain name. You will need to provide this domain name in the next step.

The automated CloudFormation setup process will configure the domain name for you, if you have a domain registered in Route 53.

So, before you proceed to the next step, go get a new domain name, or transfer an existing one to Route 53. You can do this by visiting the <a href="https://console.aws.amazon.com/route53/home" target="_blank" rel="noreferrer">Route 53 console</a>.

In addition to the domain name, you will need the Hosted Zone ID for the domain. You can find this by selecting the domain and copying the Hosted Zone ID from the right-hand side of the page.

#### 2.3.2 Link domain ownership

Link your domain to your seize.io profile by signing a message with any Ethereum address that is part of your Identity consolidation.

You can use any message signing tool, like <https://etherscan.io/verifiedSignatures>.

The message should be ONLY the domain name (all lowercase) that you are using for your Prenode, with no protocol (leave out the "https://" part) and no trailing slash, eg: `prenode.seize.io`.

When you sign with your connected Ethereum address, you will get a "signature hash". This hash will be sent out from your prenode to attest to your ownership of the domain.

### 2.4 Create the CloudFormation stack

Find an Ubuntu AMI ID for the region you will deploy in. You can find the AMI ID for your region by visiting the <a href="https://cloud-images.ubuntu.com/locator/ec2/" target="_blank" rel="noreferrer">Ubuntu Cloud Image Locator</a>. Use the filters at the bottom of the table to select your preferred region, and the latest version of Ubuntu, and be sure it is `amd64` (to work with the instance type the script uses). That should narrow it down to a single option.

If you are familiar with the AWS web-based tools, you can build the stack by visiting the <a href="https://console.aws.amazon.com/cloudformation/home" target="_blank" rel="noreferrer">CloudFormation console</a>, and uploading the template from `./aws/prenode-deployment.yaml`.

Or, you can run the commands below in your local terminal to create the stack and verify it from your own machine's CLI environment.

Set these values in your local environment (in addition to PRENODE_EC2_KEY_PAIR_NAME, which was done above) to make calling the CloudFormation script easier. You'll only need them once, to fire off the CloudFormation script from your command line. Copy the below into your CLI one at a time (with updated values) to save the values temporarily in your environment (until you close the CLI).

Replace the `your-*` values with what your stack should use.

1. What fully-qualified domain name do you want to use for accessing your Prenode? (no protocol, no trailing slash):
   - `export PRENODE_DOMAIN=your-domain-name`
1. What is the Ethereum address you want to link this Prenode to? (for seize.io Identity):
   - `export PRENODE_OWNER_ADDRESS=your-ethereum-address`
1. Use the Owner Address to sign a message (containing only the domain above) to get the signature hash:
   - `export OWNER_SIGNATURE_HASH=signature-hash-of-message`
1. What is the Hosted Zone ID for the domain you are using? (from Route 53 console):
   - `export PRENODE_HOSTED_ZONE_ID=your-route53_hosted_zone_id`
1. What email address will you use for administrative contact and SSL certificate registration?
    - `export PRENODE_EMAIL=your-email`
1. What is the AMI ID for the Ubuntu image you found?
   - `export PRENODE_AMI_ID=your-ami-id`
1. Create a new password for the Prenode database (only letters and numbers, from 20-40 characters):
    - `export PRENODE_DB_PASSWORD=your-long-db-password-less-than-40-chars`
1. What is your Alchemy API key, copied from the Alchemy Apps dashboard?
   - `export ALCHEMY_API_KEY=your-alchemy-api-key`

To keep any of these around for future terminal sessions, you can add them to your shell profile (e.g. `~/.bashrc`).

Now, you can run the following command to create the CloudFormation stack:

```bash
aws cloudformation create-stack \
  --stack-name Prenode6529 \
  --template-body "$(curl -L https://raw.githubusercontent.com/6529-Collections/6529-Prenode/HEAD/aws/prenode-deployment.yaml)" \
  --parameters ParameterKey=DomainName,ParameterValue=$PRENODE_DOMAIN \
               ParameterKey=AdminEmail,ParameterValue=$PRENODE_EMAIL \
               ParameterKey=AMIId,ParameterValue=$PRENODE_AMI_ID \
               ParameterKey=MasterUserPassword,ParameterValue=$PRENODE_DB_PASSWORD \
               ParameterKey=KeyName,ParameterValue=$PRENODE_EC2_KEY_PAIR_NAME \
               ParameterKey=HostedZoneId,ParameterValue=$PRENODE_HOSTED_ZONE_ID \
               ParameterKey=AlchemyAPIKey,ParameterValue=$ALCHEMY_API_KEY \
               ParameterKey=OwnerAddress,ParameterValue=$PRENODE_SEIZE_PROFILE \
               ParameterKey=OwnerSignatureHash,ParameterValue=$PRENODE_SEIZE_PROFILE \
  --profile 6529Prenode
```

Note: this command expects that you have properly set the environment variables in the previous step.

And you are basically done!

Give it a few moments (it might take 10 minutes or more) to create the stack. The next steps here are just to verify that everything is working as expected.

You can check the status of the stack from the AWS console, or by running:

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
ssh -i ~/.ssh/$PRENODE_EC2_KEY_PAIR_NAME.pem ubuntu@$PRENODE_IP
```

On the server, the source code can be found in `~/6529-Prenode`. From that directory, you can view logs by running `pm2 logs`.

### 2.6 Verify

Once the CloudFormation stack has completed building out all resources, verify it is working by navigating to the domain name you provided in the CloudFormation script:

```bash
https://YOUR.DOMAIN.NAME/oracle/tdh/total
```

Compare the response with

```bash
https://api.seize.io/oracle/tdh/total
```

If you registered a new domain name, be sure to verify your email address within 15 days, as required by ICANN. Look for the subject "Verify your email address for..." in your inbox.

Your Prenode should now be up and running, and ready for any TDH requests.

Thank you for supporting decentralization!

### 2.7 Clean up

Be sure you have removed the permissive IAM policy from any user accounts you created for this process.

If you want to fully remove the Prenode resources from your AWS account, you can simply delete the CloudFormation stack to remove all resources created by the script. The easiest way to do so is from the CloudFormation console, by selecting the stack and choosing "Delete Stack". Be sure to re-attach the Prenode IAM policy to your user account, to provide adequate access to complete the cleanup.

## 3. Manual configuration

If you'd like to run the 6529 Prenode in any other context (advanced), you can manually configure it using the following steps.

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

To run the project you need a file to hold environment variables. The following script will run you through the process of creating this file.

**Note:**

- you will be asked to provide database credentials

  - host
  - port
  - admin user and password (used to create database and new users for the services but not saved in .env file)
  - new database user/password

- you will be asked to provide an Alchemy API key (get one <a href="https://docs.alchemy.com/docs/alchemy-quickstart-guide" target="_blank" rel="noreferrer">here</a>)

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

The database expects some initial data. Choose to load EITHER from the latest snapshot or directly.

## 3.2.1 Restore snapshot

The best option is usually to restore a recent seize.io snapshot.

Populate your Prenode database from the latest snapshot using the following

```bash
npm run restore
```

## 3.2.2 Direct load

DO NOT PROCEED if you have already restored from a snapshot. No need, you've got the data.

If you'd like to load data directly from the chain, you can do so by following the steps below.

Two main components need to be loaded directly: NFTDelegation data and Transaction data.

Run the following to restore data from the NFTDelegation contract

```bash
npm run direct_load_nftd
```

Run the following to restore transaction data

```bash
npm run direct_load_trx
```

## 3.3 Run services

To ensure your application starts on system boot, you can use PM2’s startup script generator. Run the following command and follow the instructions provided:

```bash
pm2 startup
```

## 3.4 Set up log rotation

PM2 can also manage log rotation, which is critical for ensuring that logs do not consume all available disk space.

### 3.5 Manual start

#### 3.5.1 Run Prenode

- PM2 process name: 6529Prenode

```bash
pm2 start npm --name=6529Prenode -- run prenode
```

- **CRON:** When starting the service, several scheduled cron jobs are running at specific intervals which will consume onchain data, process it, and save the result to the database.
  e.g. discovering Transactions - there is a scheduled cron job to run every 2 minutes which detects new transactions on the chain and saves them in the database

- **Note:** On start, this service will always run the TDH calculation on start and schedule it to run at 00:00 UTC

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

### 3.6 Scripted start

```bash
scripts/start.sh
```

### 3.7 Verify

### 3.7.1 Local

To test your API locally, navigate in your browser to:

```bash
http://localhost:3000/oracle/address/0xADDRESS
```

### 3.7.2 Production

Once you have completed the above steps on your production server, you'll also need to ensure that your domain is pointing to the server's IP address, and is correctly configured for SSL.

SSL traffic on port 443 needs be routed to port 3000 to reach the API server. Use the approach appropriate for your server to configure this.

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

When this is all working, you can finally navigate to

```bash
https://YOUR-DOMAIN-NAME/oracle/address/0xADDRESS
```

Compare the response with

```bash
https://api.seize.io/oracle/address/0xADDRESS
```

## 4 Updates

Get the latest Prenode source code by updating the repository.

First ssh or connect to your instance and change to the repository directory

```bash
cd 6529-Prenode/
```

Choose between [4.1 Manual Update](#41-manual-update) or [4.2 Scripted Update](#42-scripted-update)

### 4.1 Manual update

#### 4.1.1 Pull new changes

```bash
git pull
```

#### 4.1.2 Reinstall

```bash
npm i
```

#### 4.1.3 Rebuild

```bash
npm run build
```

#### 4.1.4 Restore (optional)

At this point, if you wish to restore (optional but recommended) you can run the following:

```bash
pm2 stop 6529Prenode
npm run restore
```

#### 4.1.5 Restart Prenode and API

```bash
pm2 restart 6529Prenode
pm2 restart 6529Prenode-api
```

### 4.2 Scripted update

```bash
pm2 stop 6529Prenode
scripts/update.sh
```

Note: The scripted update will by default also restore your local database to the latest snapshot.
If you want to disable the restore process, you can run:

```bash
pm2 stop 6529Prenode
scripts/update.sh --no-restore
```
