1. [Infrastructure](#1-infrastructure)

2. [Setup](#2-setup)

   - 2.1 [Manual Setup](#21-manual-setup)
   - 2.2 [Scripted Setup](#22-scripted-setup)

3. [Set Environment](#3-set-environment)

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

**Prerequisites:**

- you have an AWS EC2 instance configured (<a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html" target="_blank" rel="noopener noreferrer">Read More</a>)

- you have an AWS RDS instance configured (<a href="https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html" target="_blank" rel="noopener noreferrer">Read More</a>)

## 2. Setup

Clone repository "6529-PreNode" at branch `main`

```
git clone  --branch main https://github.com/6529-Collections/6529-PreNode.git
```

then change directory to the repository

```bash
cd 6529-PreNode/
```

### 2.21 Local Setup

```bash
scripts/setup.sh
```

### 2.2 AWS Setup

#### 2.2.2 Configure AWS CLI

Sign in to your AWS account, create the IAM role you want to use, and generate a new Access Key.

Set up your command line interface with this access key, secret access key, and your default region:

```bash
aws configure --profile 6529Prenode
```

You can run this whenever you want to update any of these settings.

#### 2.2.2 Generate a key pair

```bash
aws ec2 create-key-pair --key-name 6529PrenodeKey --query 'KeyMaterial' --output text > ~/.ssh/6529PrenodeKey.pem --profile 6529Prenode
```

#### 2.2.3 Get a domain name

Your node will require SSL, and therefore a domain name. You will need to provide this domain name in the next step.

You can use your own domain name, or get a free subdomain to use from Duck DNS:

1. Sign in at duckdns.org
1. Create a free subdomain that you'll use to access your Prenode
1. Don't worry about configuring an IP address at this time, you will do that soon

#### 2.2.4 Run CloudFormation Stack

Find an Ubuntu AMI ID for your region. You can find the AMI ID for your region by visiting the <a href="https://cloud-images.ubuntu.com/locator/ec2/" target="_blank" rel="noopener noreferrer">Ubuntu Cloud Image Locator</a>. Use the filters at the bottom of the table to select your preferred region, and the latest version of Ubuntu, and be sure it is `amd64` (arm AMI's don't run in the free tier).

Set these values in your local environment to make calling the CloudFormation script easier. You'll just need them once, to get things going. Replace the `YOUR-*` values with what your stack should use:

```bash
export PRENODE_DOMAIN=YOUR-DOMAIN-NAME;
export PRENODE_EMAIL=YOUR-EMAIL;
export PRENODE_AMI_ID=YOUR-AMI-ID;
export PRENODE_DB_PASSWORD=YOUR-MADEUP-SECURE-RDS-PASSWORD;
export PRENODE_KEY_NAME=YOUR-AWS-SSH-KEY-NAME;
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

Now you can SSH into your EC2 instance:

```bash
ssh -i ~/.ssh/6529PrenodeKey.pem ubuntu@$PRENODE_IP
```


##### 2.2.4.1 Configure the domain name

Return to duckdns.org and configure the IP address of your EC2 instance. This will allow you to access your Prenode using the domain name you created, over HTTPS.

##### 2.2.4.2 Configure to Auto-restart on System Reboot

To ensure your application starts on system boot, you can use PM2’s startup script generator. Run the following command and follow the instructions provided:

```
pm2 startup
```

##### 2.2.4.3 Set Up Log Rotation

PM2 can also manage log rotation, which is critical for ensuring that logs do not consume all available disk space.

```
pm2 install pm2-logrotate
```

Configure log rotation settings (optional)

```
pm2 set pm2-logrotate:max_size 100M  # Rotate logs once they reach 100MB
pm2 set pm2-logrotate:retain 10      # Keep 10 rotated logs
pm2 set pm2-logrotate:compress true  # Compress (gzip) rotated logs
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD # Set the date format used in the log file names
pm2 set pm2-logrotate:rotateModule true     # Rotate the log of pm2-logrotate itself
```

## 3. Set Environment

To run the project you need a file to hold environment variable. The following script with run you through the process of creating this file.

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

## 4. Initialize DB

The database expects some initial data. Choose to load either from latest snapshot or directly

## 4.1 Restore Snapshot

Restore database from the latest snapshot using the following

```
npm run restore
```

## 4.2 Direct Load

Two main components need to be loaded directly:

### 4.2.1 NFTDelegation

Run the following to restore data from NFTDelegation contract

```
npm run direct_load_nftd
```

### 4.2.2 Transactions

Run the following to restore transaction data

```
npm run direct_load_trx
```

## 5. Run Services

Choose between [5.1 Manual Start](#51-manual-start) or [5.2 Scripted Start](#52-scripted-start)

### 5.1 Manual Start

#### 5.1.1 Run PreNode

- PM2 process name: 6529PreNode

```
pm2 start npm --name=6529PreNode -- run prenode
```

- **CRON:** When starting the service, there are several scheduled cron jobs running at specific intervals which will consume data from the chain, process and save the result to the database.
  e.g. discovering Transactions - there is a scheduled cron job to run every 2 minutes which detects new transactions on the chain and saves them in the database

- **Note:** On start, this service will always run the tdh calculation on start and the schedule it to run at 00:00 UTC

#### 5.1.2 Run API

- PM2 process name: 6529PreNode-api
- PORT: 3000

```
pm2 start npm --name=6529PreNode-api -- run api
```

**Note:** To ensure PM2 knows which processes to restart at boot, you need to save the list after starting the services

```
pm2 save
```

### 5.2 Scripted Start

```
scripts/start.sh
```

### 5.3 Test

### 5.3.1 Local

To test your api locally, navigate in your browser to:

```
http://localhost:3000/api/tdh/<address>
```

### 5.3.2 AWS

If you are using AWS EC2, navigate to

```
http://[ip-address]:3000/api/tdh/<address>
```

Note: Please make sure that you have added an inbound rule on the instance security group for port 3000

Compare the response with

```
https://api.seize.io/api/tdh/<address>
```

## 6 Updates

Choose between [6.1 Manual Update](#61-manual-update) or [6.2 Scripted Update](#62-scripted-update)

### 6.1 Manual Update

#### 6.1.1 Pull new changes

```
git pull
```

#### 6.1.2 Re-Install

```
npm i
```

#### 6.1.3 Re-Build

```
npm run build
```

#### 6.1.4 Restart PreNode and API

```
pm2 restart 6529PreNode
pm2 restart 6529PreNode-api
```

### 6.2 Scripted Update

```
scripts/update.sh
```
