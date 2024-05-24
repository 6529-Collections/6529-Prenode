1. [Infrastructure](#1-infrastructure)

2. [Setup](#2-setup)

   - 2.1 [Scripted Setup](#22-scripted-setup)
   - 2.2 [Manual Setup](#21-manual-setup)

3. [Manual Configuration](#3-set-environment)

4. [Initialize DB](#4-initialize-db)

   - 4.1 [Restore Snapshot](#41-restore-snapshot)
   - 4.2 [Direct Load](#42-direct-load)

5. [Run Services](#5-run-services)

   - 5.1 [Manual Start](#51-manual-start)
   - 5.2 [Scripted Start](#52-scripted-start)

6. [Updates](#6-updates)

   - 6.1 [Manual Update](#61-manual-update)
   - 6.2 [Scripted Update](#62-scripted-update)

7. [OpenAPI Definition](https://6529-collections.github.io/6529-PreNode/docs)

## 1. Infrastructure

The 6529 PreNode is a service that provides a RESTful API for querying TDH data from the 6529 Collections smart contracts. It is the same logic used on seize.io, but provides a way to query data from the blockchain without needing to visit a web page.

To run the prenode, you'll need a database, a server configured with SSL, and a domain name.

Since the setup of all these things can be a little tricky, we've provided a CloudFormation script that will automate much of the setup process for you. This script will create an EC2 instance, an RDS instance, and a Route 53 domain, and configure them all to work together in a standalone VPC environment (and no, you don't need to know what all that means to get it going).

## 2. AWS Setup

You'll need just a few things in place before starting the automated setup process.

**Prerequisites:**

- You need an AWS account, and just a little familiarity with using the AWS console (<a href="https://aws.amazon.com/" target="_blank" rel="noopener noreferrer">Sign in now</a>) or the AWS CLI (<a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html" target="_blank" rel="noopener noreferrer">Read More</a>)

- Since the node is required to run over SSL, you'll need a domain name. The automated setup process will then get a free SSL cert for you.

#### 2.1 Configure AWS CLI

Sign in to your AWS account, create the IAM role you want to use, and generate a new Access Key.

Set up your command line interface with this access key, secret access key, and your default region:

```bash
aws configure --profile 6529Prenode
```

You can run this whenever you want to update any of these settings.

#### 2.2 Generate a key pair

```bash
aws ec2 create-key-pair --key-name 6529PrenodeKey --query 'KeyMaterial' --output text > ~/.ssh/6529PrenodeKey.pem --profile 6529Prenode
```

#### 2.3 Get a domain name

Your node will require SSL, and therefore a domain name. You will need to provide this domain name in the next step.

The automated setup process will configure the domain name for you, if you have a domain registered in Route 53. 

Before you proceed to the next step, go get a new domain name, or transfer an existing one to Route 53. You can do this by visiting the <a href="https://console.aws.amazon.com/route53/home" target="_blank" rel="noopener noreferrer">Route 53 console</a>.

#### 2.4 Create the CloudFormation Stack

Find an Ubuntu AMI ID for your region. You can find the AMI ID for your region by visiting the <a href="https://cloud-images.ubuntu.com/locator/ec2/" target="_blank" rel="noopener noreferrer">Ubuntu Cloud Image Locator</a>. Use the filters at the bottom of the table to select your preferred region, and the latest version of Ubuntu, and be sure it is `amd64` (arm AMI's don't run in the free tier).

Set these values in your local environment to make calling the CloudFormation script easier. You'll just need them once, to get things going. Replace the `YOUR-*` values with what your stack should use:

```bash
export PRENODE_DOMAIN=YOUR-DOMAIN-NAME;
export PRENODE_EMAIL=YOUR-EMAIL;
export PRENODE_AMI_ID=YOUR-AMI-ID;
export PRENODE_DB_PASSWORD=YOUR-MADEUP-SECURE-RDS-PASSWORD;
export PRENODE_KEY_NAME=YOUR-AWS-SSH-KEY-NAME;
export PRENODE_HOSTED_ZONE_ID=YOUR-ROUTE53_HOSTED_ZONE_ID;
export ALCHEMY_API_KEY=YOUR-ALCHEMY-API-KEY;
```

Run the following command to create the CloudFormation stack:

```bash
aws cloudformation create-stack \
  --stack-name Prenode6529 \
  --template-body file://./scripts/aws-bootstrap.yaml \
  --parameters ParameterKey=DomainName,ParameterValue=$PRENODE_DOMAIN \
               ParameterKey=AdminEmail,ParameterValue=$PRENODE_EMAIL \
               ParameterKey=AMIId,ParameterValue=$PRENODE_AMI_ID \
               ParameterKey=MasterUserPassword,ParameterValue=$PRENODE_DB_PASSWORD \
               ParameterKey=KeyName,ParameterValue=$PRENODE_KEY_NAME \
               ParameterKey=HostedZoneId,ParameterValue=$PRENODE_HOSTED_ZONE_ID \
               ParameterKey=AlchemyAPIKey,ParameterValue=$ALCHEMY_API_KEY \
  --profile 6529Prenode
```

Give it a few moments to create the stack. You can check the status of the stack by running:

```bash
aws cloudformation describe-stacks --stack-name Prenode6529 --profile 6529Prenode
```

Once the stack is created, you can hold the public IP address of your EC2 instance in an env var by running:

```bash
export PRENODE_IP=`aws cloudformation describe-stacks --stack-name Prenode6529 --query "Stacks[0].Outputs[?OutputKey=='ElasticIPAddress'].OutputValue" --output text --profile 6529Prenode`; echo $PRENODE_IP;
```

Now you can SSH into your EC2 instance, if you want to do any manual configuration.:

```bash
ssh -i ~/.ssh/6529PrenodeKey.pem ubuntu@$PRENODE_IP
```

## 3. Manual configuration

If you'd like to run the 6529 PreNode in any other context, you can manually configure it using the following steps.

### 3.1 Get the code

Clone repository "6529-PreNode" at branch `main`

```
git clone --branch main https://github.com/6529-Collections/6529-PreNode.git
```

then change directory to the repository

```bash
cd 6529-PreNode/
```

```bash
scripts/setup.sh # Install dependencies, configure pm2, turn on log rotations
```

To run the project you need a file to hold environment variable. If you need to do it manually, the following script with run you through the process of creating this file.

**Note:**

- you will be asked to provide database credentials

  - host
  - port
  - admin user and password (used to create database and new users for the services but not saved in .env file)
  - new database user/password

- you will be asked to provide Alchemy API key (get one <a href="https://docs.alchemy.com/docs/alchemy-quickstart-guide" target="_blank" rel="noopener noreferrer">here</a>)

- at the end of this process:
  - new database created
  - new read and write users created
  - database tables created (empty)
  - a new file will be created `.env.prenode`

```
npm run set_env
```

<a href="https://github.com/6529-Collections/6529-PreNode/blob/main/.env.sample" target="_blank" rel="noopener noreferrer">Sample .env file</a>

## 3.2 Initialize DB

The database expects some initial data. Choose to load either from latest snapshot or directly

## 3.3 Restore Snapshot

Restore database from the latest snapshot using the following

```
npm run restore
```

## 3.4 Direct Load

Two main components need to be loaded directly:

### 3.4.1 NFTDelegation

Run the following to restore data from NFTDelegation contract

```
npm run direct_load_nftd
```

### 3.4.2 Transactions

Run the following to restore transaction data

```
npm run direct_load_trx
```

## 3.5 Run Services

To ensure your application starts on system boot, you can use PM2’s startup script generator. Run the following command and follow the instructions provided:

```
pm2 startup
```

##### 2.4.3 Set Up Log Rotation

PM2 can also manage log rotation, which is critical for ensuring that logs do not consume all available disk space.

### 3.6 Manual Start

#### 3.6.1 Run Prenode

- PM2 process name: 6529Prenode

```
pm2 start npm --name=6529Prenode -- run prenode
```

- **CRON:** When starting the service, there are several scheduled cron jobs running at specific intervals which will consume data from the chain, process and save the result to the database.
  e.g. discovering Transactions - there is a scheduled cron job to run every 2 minutes which detects new transactions on the chain and saves them in the database

- **Note:** On start, this service will always run the tdh calculation on start and the schedule it to run at 00:00 UTC

#### 3.6.2 Run API

- PM2 process name: 6529Prenode-api
- PORT: 3000

```
pm2 start npm --name=6529Prenode-api -- run api
```

**Note:** To ensure PM2 knows which processes to restart at boot, you need to save the list after starting the services

```
pm2 save
```

### 3.7 Scripted Start

```
scripts/start.sh
```

## 4 Test

### 4.1 Local

To test your api locally, navigate in your browser to:

```
http://localhost:3000/api/tdh/<address>
```

### 4.2 AWS

If you are using AWS EC2, navigate to

```
http://[ip-address]:3000/api/tdh/<address>
```

Note: Please make sure that you have added an inbound rule on the instance security group for port 3000

Compare the response with

```
https://api.seize.io/api/tdh/<address>
```

## 5 Updates

Choose between [6.1 Manual Update](#61-manual-update) or [6.2 Scripted Update](#62-scripted-update)

### 5.1 Manual Update

#### 5.1.1 Pull new changes

```
git pull
```

#### 5.1.2 Re-Install

```
npm i
```

#### 5.1.3 Re-Build

```
npm run build
```

#### 5.1.4 Restart Prenode and API

```
pm2 restart 6529Prenode
pm2 restart 6529Prenode-api
```

### 5.2 Scripted Update

```
scripts/update.sh
```
