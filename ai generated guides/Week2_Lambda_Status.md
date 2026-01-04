# Week 2 Status: Lambda Implementation Primer

This document summarizes what has been achieved for **Week 2** (Lines 280-328) and provides instructions for the steps that must be completed manually due to IAM permissions.

## ✅ Accomplished So Far
1.  **DynamoDB Data**: Created and formatted `books-data.json` and `reading-lists-data.json`.
2.  **Data Ingestion**: Successfully loaded 10 books and initial reading lists into your AWS tables via CLI.
3.  **Code Preparation**: Drafted the production-ready code for your first Lambda function.
4.  **Lambda Deployment**: Successfully created and tested the `library-get-books` function manually. 🚀

---

## 🛑 What Needs to Be Done (Next)
I was unable to create the **IAM Execution Role** because the `library-app-dev` user is not authorized to create new roles. (You handled this manually!)

### 🛠️ Manual Steps for You (AWS Console)

#### 1. Create the Execution Role
- Go to the **IAM Console** > **Roles** > **Create role**.
- Select **AWS Service** and **Lambda**.
- Click **Next**.
- Search for and check the box for: **`AmazonDynamoDBReadOnlyAccess`**.
- Search for and check the box for: **`AWSLambdaBasicExecutionRole`** (this allows logging).
- Click **Next**.
- **Role Name**: `library-get-books-role`.
- Click **Create role**.

#### 2. Create the Lambda Function
- Go to the **Lambda Console** > **Create function**.
- **Function name**: `library-get-books`.
- **Runtime**: `Node.js 20.x`.
- **Architecture**: `arm64`.
- Under **Change default execution role**:
    - Select **Use an existing role**.
    - Pick the `library-get-books-role` you just created.
- Click **Create function**.

#### 3. Upload the Code
- Once the function is created, look at the **Code** tab.
- You can copy the code from your local file [`infrastructure/index.mjs`](file:///C:/Users/rh22/Desktop/library-recommendation-system/infrastructure/index.mjs) and paste it into the online editor.
- **Important**: Rename the file in the Lambda console to `index.mjs` (it defaults to `index.mjs` if you use ES modules) or ensure the "Handler" setting matches your filename.
- Click **Deploy**.

---

## 🎯 Next Step After Manual Work
Once the function is deployed, you will proceed to **API Gateway** (Line 332) to create the `/books` endpoint and link it to this new Lambda.
