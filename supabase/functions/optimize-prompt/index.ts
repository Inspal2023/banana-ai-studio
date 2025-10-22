Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userPrompt } = await req.json();

    if (!userPrompt) {
      throw new Error('User prompt is required');
    }

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const systemPrompt = `You are a professional AI image generation prompt engineer specializing in Nano Banana (Gemini 2.5 Flash Image) model.

Your task is to optimize user prompts for better image generation results. You MUST provide TWO versions:

1. Chinese version (optimized_prompt_cn): A detailed Chinese description for users to understand
2. English version (optimized_prompt_en): A professional English prompt for AI image generation

Follow these guidelines for the English version:

1. Be Hyper-Specific: Add precise details about:
   - Subject appearance (colors, materials, textures)
   - Lighting (direction, intensity, color temperature)
   - Composition (camera angle, framing)
   - Style (photorealistic, artistic, technical)
   - Environment (background, setting, atmosphere)

2. Use Clear Structure:
   - Start with action verb (Create, Generate, Convert)
   - Describe main subject
   - Add environmental context
   - Specify technical details (resolution, style, lighting)

3. Include Technical Parameters:
   - Resolution quality (high-resolution, 8K, photorealistic)
   - Lighting setup (studio lighting, natural light, golden hour)
   - Camera details (wide-angle, macro, 45-degree angle)
   - Style modifiers (seamless integration, natural blending)

4. Avoid Negative Prompts: Instead of "no cars", say "empty street with no traffic signs"

5. Maintain Consistency: When editing images, explicitly state what to keep unchanged

Output format (JSON):
{
  "optimized_prompt_cn": "详细的中文描述...",
  "optimized_prompt_en": "Professional English prompt for AI..."
}

Return ONLY valid JSON, no additional text.`;

    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API failed: ${errorText}`);
    }

    const result = await response.json();
    const optimizedContent = result.choices[0].message.content;
    
    // Parse JSON response from DeepSeek
    let optimizedPromptCn = '';
    let optimizedPromptEn = '';
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(optimizedContent);
      optimizedPromptCn = parsed.optimized_prompt_cn || parsed.optimizedPromptCn || '';
      optimizedPromptEn = parsed.optimized_prompt_en || parsed.optimizedPromptEn || '';
    } catch (e) {
      // If not JSON, treat as plain text (fallback)
      optimizedPromptEn = optimizedContent;
      optimizedPromptCn = userPrompt; // Keep original as Chinese version
    }

    return new Response(JSON.stringify({
      data: { 
        optimizedPromptCn,
        optimizedPromptEn,
        // Legacy field for backwards compatibility
        optimizedPrompt: optimizedPromptEn
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Prompt optimization error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'PROMPT_OPTIMIZATION_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});