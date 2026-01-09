import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const ddb = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddb);

const TABLE_NAME = 'Books'; // Ensure this matches your table name

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  try {
    const body = JSON.parse(event.body || '{}');
    const userQuery = body.query || 'recommend me a book';

    // 1. Fetch existing books from DynamoDB (limit to 20 to save context window)
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 20,
    });
    const dbResult = await docClient.send(scanCommand);
    const books = dbResult.Items || [];

    // Format books for context
    const booksContext = books
      .map((b) => `- ID: ${b.id}, Title: "${b.title}", Author: "${b.author}", Genre: ${b.genre}`)
      .join('\n');

    // 2. Construct Prompt
    const prompt = `You are an expert librarian AI. A user is looking for book recommendations.

User Query: "${userQuery}"

Here is a list of books currently in our library catalog:
${booksContext}

INSTRUCTIONS:
1. Recommend exactly 3 books.
2. If the user's query matches books in our catalog, PRIORITIZE recommending them and include their "bookId" (the ID from the list).
3. If no catalog books match well, recommend famous real-world books instead (do not invent fake books).
4. For external books, do NOT include a "bookId".
5. OUTPUT STRICT JSON ONLY. Do not include markdown formatting or chat text.

Response Format:
[
  {
    "bookId": "string" (ONLY if from catalog),
    "title": "string",
    "author": "string",
    "reason": "string",
    "confidence": 0.95
  }
]`;

    // 3. Call Bedrock (Claude 3 Haiku)
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiText = responseBody.content[0].text;
    console.log('AI Raw Response:', aiText);

    // 4. Robust JSON Parsing (Extract JSON array from potential text)
    let recommendations = [];
    try {
      // Try direct parse
      recommendations = JSON.parse(aiText);
    } catch (e) {
      // Try regex extraction if direct parse fails
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    // Wrap in object expected by frontend
    const result = { recommendations: recommendations };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
    };
  }
};
