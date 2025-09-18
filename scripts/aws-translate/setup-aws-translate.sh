#!/bin/bash
# filepath: setup-aws-translate.sh

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Setting up AWS Translate for Account ID: $AWS_ACCOUNT_ID"

# Replace YOUR_ACCOUNT_ID in policy files
sed -i.bak "s/YOUR_ACCOUNT_ID/$AWS_ACCOUNT_ID/g" translate-input-policy.json
sed -i.bak "s/YOUR_ACCOUNT_ID/$AWS_ACCOUNT_ID/g" translate-output-policy.json

# Create S3 buckets
echo "Creating S3 buckets..."
aws s3 mb s3://sea-bridge-translate-input
aws s3 mb s3://sea-bridge-translate-output

# Create IAM role
echo "Creating IAM role..."
aws iam create-role --role-name translate-service-role \
  --assume-role-policy-document file://translate-trust-policy.json

# Wait a moment for role creation
sleep 3

# Attach policies to role
echo "Attaching policies to IAM role..."
aws iam attach-role-policy --role-name translate-service-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy --role-name translate-service-role \
  --policy-arn arn:aws:iam::aws:policy/TranslateFullAccess

# Set bucket policies
echo "Setting bucket policies..."
aws s3api put-bucket-policy --bucket sea-bridge-translate-input --policy file://translate-input-policy.json
aws s3api put-bucket-policy --bucket sea-bridge-translate-output --policy file://translate-output-policy.json

echo "Setup complete!"
echo "Role ARN: arn:aws:iam::$AWS_ACCOUNT_ID:role/translate-service-role"
echo ""
echo "Add these to your .env.local:"
echo "AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"
echo "AWS_TRANSLATE_ROLE_ARN=arn:aws:iam::$AWS_ACCOUNT_ID:role/translate-service-role"