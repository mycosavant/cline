
'use server';
/**
 * @fileOverview API route to fetch available models from OpenRouter.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { ModelInfo } from '@/contexts/settings-context'; // Import updated type

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';

// Helper function to safely convert string cost per token to number cost per Mtok
function parseCost(costString: string | undefined | null): number | null {
    if (typeof costString !== 'string' || costString === "" || costString === "0") {
        return 0; // Treat missing or zero cost as free
    }
    const costPerToken = parseFloat(costString);
    if (isNaN(costPerToken)) {
        return null; // Invalid format
    }
    // Multiply by 1,000,000 to get cost per million tokens
    return costPerToken * 1000000;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = `models-openrouter-${Date.now()}`;
  console.log(`[${requestId}] Received GET request to /api/models/openrouter`);

  try {
    // No API key needed for this endpoint according to OpenRouter docs
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'GET',
        headers: {
            // Optional: Add recommended headers if desired
            // 'HTTP-Referer': $YOUR_SITE_URL,
            // 'X-Title': $YOUR_SITE_NAME,
        },
    });

    console.log(`[${requestId}] OpenRouter /models response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] Failed to fetch models from OpenRouter (${response.status}):`, errorText);
      return NextResponse.json({ error: `Failed to fetch models: ${response.status} ${errorText || response.statusText}` }, { status: response.status });
    }

    const data = await response.json();

    // Check if the response has the expected structure
    if (!data || !Array.isArray(data.data)) {
        console.error(`[${requestId}] Invalid response structure from OpenRouter /models:`, data);
        return NextResponse.json({ error: 'Invalid response format from OpenRouter models endpoint.' }, { status: 500 });
    }

    // Map the response data to the enhanced ModelInfo structure
    const models: ModelInfo[] = data.data.map((model: any) => {
        const inputCost = parseCost(model.pricing?.prompt);
        const outputCost = parseCost(model.pricing?.completion);
        const contextLength = model.context_length ? parseInt(model.context_length, 10) : null;
        const provider = model.id.split('/')[0] || 'unknown'; // Extract provider

        return {
            id: model.id,
            name: model.name || model.id, // Use name if available, otherwise default to id
            provider: provider, // Include provider
            description: model.description,
            contextLength: !isNaN(contextLength!) ? contextLength : null,
            inputCostMtok: inputCost,
            outputCostMtok: outputCost,
        };
    }).filter((model): model is ModelInfo => !!model.id); // Ensure model has an ID and filter out potential nulls/undefined

    console.log(`[${requestId}] Successfully fetched and mapped ${models.length} models.`);
    return NextResponse.json({ models });

  } catch (error: any) {
    console.error(`[${requestId}] Error fetching OpenRouter models:`, error);
    return NextResponse.json(
      { error: `Failed to fetch OpenRouter models: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
