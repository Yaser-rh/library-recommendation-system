# Recommendations API Troubleshooting & Llama 3 Alternative

If you are receiving an "Error: Failed to get recommendations" (500) and the CloudWatch Logs for `library-get-recommendations` show a `ResourceNotFoundException` relating to "model use case details", it means AWS Anthropic model access is restricted for your account.

You have two choices:

1. **Submit Anthropic Use Case**: Go to Bedrock Console > Model Access > Anthropic and fill out the form (results can take 24-48 hours).
2. **Use Meta Llama 3**: Much faster access.

## Using Meta Llama 3 8B Instruct

Follow these steps to switch to Llama 3:

### Step 1: Request Model Access

1.  Go to **Amazon Bedrock Console**.
2.  Go to **Model Access** (left sidebar).
3.  Click **Edit**.
4.  Find **Meta** and check **Llama 3 8B Instruct**.
5.  Click **Save Changes**. (Access is usually granted within minutes).

### Step 2: Update Lambda Code (`library-get-recommendations`)

Replace your current handler code with this Llama 3 compatible version. Llama 3 uses a different request/response structure than Claude.

```javascript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const userQuery = body.query;

    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a helpful librarian AI. Recommend 3 books based on the user's interest. 
Respond ONLY with a JSON object.

JSON Format:
{
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "reason": "Why this book matches",
      "confidence": 0.95
    }
  ]
}

<|eot_id|><|start_header_id|>user<|end_header_id|>

${userQuery}

<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

    const command = new InvokeModelCommand({
      modelId: 'meta.llama3-8b-instruct-v1:0', // Meta Llama 3 8B
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_gen_len: 1024,
        temperature: 0.5,
        top_p: 0.9,
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Llama 3 response is in responseBody.generation
    const aiResponse = responseBody.generation;

    // Clean up potential non-JSON text around the object
    const jsonStart = aiResponse.indexOf('{');
    const jsonEnd = aiResponse.lastIndexOf('}') + 1;
    const jsonString = aiResponse.substring(jsonStart, jsonEnd);

    const recommendations = JSON.parse(jsonString);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(recommendations),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to get recommendations' }),
    };
  }
};
```

### Step 3: Test

After saving and deploying the new Lambda code, try the "Get Recommendations" feature again in the frontend!
