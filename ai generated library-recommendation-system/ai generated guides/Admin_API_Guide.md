# Admin API Implementation Guide (Book Creation)

This guide details the implementation of the `POST /books` Lambda function and API Gateway configuration to allow administrative users to add new books to the library.

## Overview

We will implement the `library-create-book` Lambda function which will write new book records to the `Books` DynamoDB table.

**Table Name**: `Books`
**Partition Key**: `id` (String)

## Lambda Function: `library-create-book`

This function validates the input and saves a new book to DynamoDB.

**Permissions**: `AmazonDynamoDBFullAccess` (or specific `PutItem` permission for the `Books` table)

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { title, author, genre, description, coverImage, rating, publishedYear, isbn } = body;

    // Basic validation
    if (!title || !author) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Title and Author are required' }),
      };
    }

    const newBook = {
      id: body.id || randomUUID(), // Use provided ID or generate one
      title,
      author,
      genre: genre || 'Uncategorized',
      description: description || '',
      coverImage: coverImage || 'https://placehold.co/400x600?text=No+Cover',
      rating: parseFloat(rating) || 0,
      publishedYear: parseInt(publishedYear) || new Date().getFullYear(),
      isbn: isbn || '',
      createdAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: 'Books',
      Item: newBook,
    });

    await docClient.send(command);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(newBook),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to create book' }),
    };
  }
};
```

## API Gateway Integration

Follow these steps to connect your Lambda function to the API.

### Step 1: Create the POST Method

1.  **Go to API Gateway Console** and select your `library-api`.
2.  **Select the `/books` Resource**.
3.  **Create Method**:
    - Method Type: `POST`.
    - Integration Type: **Lambda Function**.
    - Select your `library-create-book` function.
    - Click **Create Method**.

### Step 2: Apply Cognito Authorizer

1.  Select the `POST` method you just created.
2.  Click on **Method Request**.
3.  Click **Edit**.
4.  For **Authorization**, select `CognitoAuthorizer`.
5.  Click **Save**.

### Step 3: Enable CORS

1.  Select the `/books` resource.
2.  Click **Enable CORS**.
3.  In **Access-Control-Allow-Methods**, ensure `POST` is selected (along with `GET`).
4.  In **Access-Control-Allow-Headers**, ensure `Authorization` is included.
5.  Click **Save**.

### Step 4: Deploy API

1.  Click **Deploy API**.
2.  Select Stage: `dev`.
3.  Click **Deploy**.

## Verification

Once deployed, you can test this from the **Admin Dashboard** in your application. Ensure you are logged in with a user that is part of the `Admins` group in Cognito.
