# Week 1: Frontend Exploration & Serverless Foundations

This plan outlines the steps to get the frontend running locally and deploy your first AWS Lambda function.

## Proposed Changes

### Environment Setup
1. **Frontend**: Install dependencies and start the Vite development server.
2. **AWS CLI**: Ensure the CLI is configured with the IAM user created during account setup.

### AWS Backend (Next Step)
1. **API Gateway**: Create a REST API with a `/hello` GET method to trigger the Lambda.
2. **Verification**: Test the endpoint with `curl` or in the browser.

## Verification Plan

### Automated/Tool Verification
- Run `npm run dev` and check if the frontend is accessible.
- Use `curl` to verify the API Gateway endpoint returns the Lambda response.

### Manual Verification
- Verify the "Hello from Lambda!" message appears in the browser or terminal.
