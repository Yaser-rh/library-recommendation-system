# Reading Lists API Implementation Guide

This guide details the implementation of the Reading Lists API Lambda functions for the Library Recommendation System. These functions will allow users to manage their personal reading lists.

## Overview

We will implement CRUD (Create, Read, Update, Delete) operations for the `ReadingLists` DynamoDB table.

**Table Name**: `ReadingLists`
**Partition Key**: `userId` (String)
**Sort Key**: `id` (String)
**GSI**: `id-index` (Partition Key: `id`)

## Lambda Functions

### 1. `library-get-reading-lists` (GET /reading-lists)

This function fetches all reading lists for the authenticated user. It relies on the Cognito User ID provided in the interaction context, but for simplicity in this guide, we'll assume the `userId` is passed as a query parameter or extracted from the event context. In a real-world scenario with Cognito Authorizer, you would extract `sub` from `event.requestContext.authorizer.claims`.

**Permissions**: `AmazonDynamoDBReadOnlyAccess`

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    // In a fully integrated setup, you would get userId from the authorizer claims:
    // This is set automatically by the Cognito Authorizer configured in Week 3.
    const userId =
      event.requestContext?.authorizer?.claims?.sub || event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing userId (Authorize first or pass via query param for testing)',
        }),
      };
    }

    const command = new QueryCommand({
      TableName: 'ReadingLists',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });

    const response = await docClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response.Items),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to fetch reading lists' }),
    };
  }
};
```

### 2. `library-create-reading-list` (POST /reading-lists)

Creates a new reading list.

**Permissions**: `AmazonDynamoDBFullAccess` (or specific `PutItem` permission)

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    // Prefer the authenticated user ID from Cognito, fallback to body for testing
    const userId = event.requestContext?.authorizer?.claims?.sub || body.userId;
    const { name, description, books } = body;

    if (!userId || !name) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'UserId and Name are required' }),
      };
    }

    const newList = {
      id: randomUUID(),
      userId,
      name,
      description: description || '',
      books: books || [], // Array of book objects or book IDs
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: 'ReadingLists',
      Item: newList,
    });

    await docClient.send(command);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(newList),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to create reading list' }),
    };
  }
};
```

### 3. `library-update-reading-list` (PUT /reading-lists/{id})

Updates an existing reading list's details or content.

**Permissions**: `AmazonDynamoDBFullAccess`

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const listId = event.pathParameters.id;
    const body = JSON.parse(event.body);
    // Identify the user via Cognito claim or body
    const userId = event.requestContext?.authorizer?.claims?.sub || body.userId;
    const { name, description, books } = body; // All optional except userId for key

    // NOTE: In DynamoDB, to update an item, you ideally need the full Primary Key (Partition + Sort)
    // If your API path only provides `id` (Sort Key), you MUST also get the `userId` (Partition Key)
    // from the request context (authorizer) or body to form the Key.

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'UserId is required to identify the list' }),
      };
    }

    // Dynamic update expression builder
    let updateExpression = 'set updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString(),
    };
    const expressionAttributeNames = {};

    if (name) {
      updateExpression += ', #name = :name';
      expressionAttributeNames['#name'] = 'name'; // 'name' is reserved in Dynamo
      expressionAttributeValues[':name'] = name;
    }
    if (description !== undefined) {
      updateExpression += ', description = :desc';
      expressionAttributeValues[':desc'] = description;
    }
    if (books) {
      updateExpression += ', books = :books';
      expressionAttributeValues[':books'] = books;
    }

    const command = new UpdateCommand({
      TableName: 'ReadingLists',
      Key: {
        userId: userId,
        id: listId,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames:
        Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const response = await docClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response.Attributes),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to update reading list' }),
    };
  }
};
```

### 4. `library-delete-reading-list` (DELETE /reading-lists/{id})

Deletes a reading list.

**Permissions**: `AmazonDynamoDBFullAccess`

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const listId = event.pathParameters.id;
    // As with Update, we need the userId to define the Key
    const userId =
      event.requestContext?.authorizer?.claims?.sub || event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing userId (Authorize first or pass via query param for testing)',
        }),
      };
    }

    const command = new DeleteCommand({
      TableName: 'ReadingLists',
      Key: {
        userId: userId,
        id: listId,
      },
    });

    await docClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Reading list deleted' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to delete reading list' }),
    };
  }
};
```

## API Gateway Integration

Follow these steps to connect your 4 Lambda functions to your API.

### Step 1: Create the `/reading-lists` Resource

1.  **Go to API Gateway Console** and select your `library-api-test` (or equivalent).
2.  **Create `/reading-lists` Resource**:
    - Click **Resources** in the left sidebar.
    - Click on the root path `/`.
    - Click **Create Resource**.
    - Resource Name: `reading-lists`
    - Resource Path: `/reading-lists`
    - Click **Create Resource**.
3.  **Create GET Method**:
    - Select `/reading-lists`.
    - Click **Create Method**.
    - Method Type: `GET`.
    - Integration Type: **Lambda Function**.
    - Select your `library-get-reading-lists` function.
    - Click **Save**.
4.  **Create POST Method**:
    - Select `/reading-lists`.
    - Click **Create Method**.
    - Method Type: `POST`.
    - Integration Type: **Lambda Function**.
    - Select your `library-create-reading-list` function.
    - Click **Save**.

### Step 2: Create the `/{id}` Resource (Sub-resource)

1.  **Select `/reading-lists`** resource.
2.  **Create /{id} Resource**:
    - Click **Create Resource**.
    - Resource Name: `ReadingListID`
    - Resource Path: `{id}` (The curly braces are important for path parameters).
    - Click **Create Resource**.
3.  **Create PUT Method**:
    - Select `{id}`.
    - Click **Create Method**.
    - Method Type: `PUT`.
    - Integration Type: **Lambda Function**.
    - Select your `library-update-reading-list` function.
    - Click **Save**.
4.  **Create DELETE Method**:
    - Select `{id}`.
    - Click **Create Method**.
    - Method Type: `DELETE`.
    - Integration Type: **Lambda Function**.
    - Select your `library-delete-reading-list` function.
    - Click **Save**.

### Step 3: Apply Cognito Authorizer (Security)

Since you completed Week 3, you should already have a `CognitoAuthorizer` created.

1.  **For EACH of the 4 methods** you just created (GET /reading-lists, POST /reading-lists, PUT /reading-lists/{id}, DELETE /reading-lists/{id}):
    - Select the method (e.g., `GET`).
    - Click on **Method Request**.
    - Click **Edit**.
    - For **Authorization**, select `CognitoAuthorizer`.
    - Click **Save**.
    - _Note: This ensures only logged-in users can access these functions._

### Step 4: Enable CORS (Connecting to Frontend)

1.  **Enable for `/reading-lists`**:
    - Select `/reading-lists` resource.
    - Click **Enable CORS**.
    - In **Access-Control-Allow-Methods**, ensure `GET` and `POST` are selected.
    - Click **Save**.
2.  **Enable for `{id}`**:
    - Select `{id}` resource.
    - Click **Enable CORS**.
    - In **Access-Control-Allow-Methods**, ensure `PUT` and `DELETE` are selected.
    - Click **Save**.

### Step 5: Deploy API

1.  Click the orange **Deploy API** button (or click **Resources** > **Deploy API**).
2.  Select Stage: `dev`.
3.  Click **Deploy**.

## Testing your API

Once deployed, you can test these using `curl` or the "Test" tab in AWS Console.

**Test GET Reading Lists (with manual ID for now):**

```bash
# If testing before Cognito is fully hooked on frontend
curl "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev/reading-lists?userId=test-user-123"
```

**Next Steps**:
After this is done, the frontend code in `src/services/api.ts` (updated in Week 3) will automatically work with these endpoints, providing the Cognito token in the `Authorization` header!
