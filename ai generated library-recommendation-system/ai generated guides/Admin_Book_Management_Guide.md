# Admin API Guide - Edit & Delete Books

This guide details the implementation of the backend APIs required for the Admin "Edit" and "Delete" features.

## 1. Lambda Functions

You need to create two new Lambda functions.

### A. `library-update-book` (PUT /books/{id})

Updates an existing book's details.

**Permissions**: `AmazonDynamoDBFullAccess`

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const bookId = event.pathParameters.id;
    const body = JSON.parse(event.body);

    // Fields to update
    const { title, author, genre, description, coverImage, rating, publishedYear, isbn } = body;

    // Build update expression dynamically
    let updateExpression = 'set #updatedAt = :updatedAt';
    const expressionAttributeNames = { '#updatedAt': 'updatedAt' };
    const expressionAttributeValues = { ':updatedAt': new Date().toISOString() };

    if (title) {
      updateExpression += ', #title = :title';
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = title;
    }
    if (author) {
      updateExpression += ', author = :author';
      expressionAttributeValues[':author'] = author;
    }
    if (genre) {
      updateExpression += ', genre = :genre';
      expressionAttributeValues[':genre'] = genre;
    }
    if (description) {
      updateExpression += ', description = :desc';
      expressionAttributeValues[':desc'] = description;
    }
    if (coverImage) {
      updateExpression += ', coverImage = :cover';
      expressionAttributeValues[':cover'] = coverImage;
    }
    if (rating !== undefined) {
      updateExpression += ', rating = :rating';
      expressionAttributeValues[':rating'] = rating;
    }
    if (publishedYear) {
      updateExpression += ', publishedYear = :year';
      expressionAttributeValues[':year'] = publishedYear;
    }
    if (isbn) {
      updateExpression += ', isbn = :isbn';
      expressionAttributeValues[':isbn'] = isbn;
    }

    const command = new UpdateCommand({
      TableName: 'Books',
      Key: { id: bookId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
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
      body: JSON.stringify({ error: 'Failed to update book' }),
    };
  }
};
```

### B. `library-delete-book` (DELETE /books/{id})

Deletes a book from the database.

**Permissions**: `AmazonDynamoDBFullAccess`

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const bookId = event.pathParameters.id;

    const command = new DeleteCommand({
      TableName: 'Books',
      Key: { id: bookId },
    });

    await docClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Book deleted successfully' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to delete book' }),
    };
  }
};
```

## 2. API Gateway Configuration

### Step 1: Create Resource `/{id}` under `/books`

1.  Select the `/books` resource.
2.  Create a child resource with **Resource Path**: `{id}`.

### Step 2: Create Methods

**For PUT (Edit):**

1.  Select `/{id}`.
2.  Create Method: `PUT`.
3.  Integration: `library-update-book` Lambda.

**For DELETE (Delete):**

1.  Select `/{id}`.
2.  Create Method: `DELETE`.
3.  Integration: `library-delete-book` Lambda.

### Step 3: Security & CORS (Important!)

1.  **Authorization**: Attach `CognitoAuthorizer` to **BOTH** the `PUT` and `DELETE` methods.
2.  **CORS**: Select the `/{id}` resource and click **Enable CORS**.
    - Ensure `PUT` and `DELETE` are selected in "Access-Control-Allow-Methods".
    - Ensure `Authorization` is in the Headers list.
    - Click Save.

### Step 4: Deploy

1.  Click **Deploy API** -> Stage `dev`.
