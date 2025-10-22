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
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const duomiApiKey = Deno.env.get('DUOMI_API_KEY');
    if (!duomiApiKey) {
      throw new Error('DUOMI_API_KEY not configured');
    }

    // Build prompt for standard 3-view orthographic projection
    const prompt = `Generate three standard orthographic views of the product/subject from [Image1]. Create three separate views arranged side by side: 1. Front view - straight-on frontal perspective, 2. Side view - 90-degree side profile, 3. Top view - bird's eye view from directly above. Maintain consistent proportions, details, and appearance across all three views. Use clean white background, even studio lighting, and professional product photography style. High-resolution, technical drawing quality. Do not add any text labels or annotations on the image.`;

    // Call Duomi API
    const response = await fetch('https://duomiapi.com/api/gemini/nano-banana-edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': duomiApiKey
      },
      body: JSON.stringify({
        prompt: prompt,
        image_urls: [imageUrl],
        aspect_ratio: '16:9'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Duomi API failed: ${errorText}`);
    }

    const result = await response.json();
    
    // Check if we got a task_id (async mode)
    if (result.data && result.data.task_id) {
      const taskId = result.data.task_id;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(`https://duomiapi.com/api/gemini/nano-banana/${taskId}`, {
          headers: {
            'Authorization': duomiApiKey
          }
        });
        
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          
          if (statusResult.data && statusResult.data.state === 'succeeded') {
            const imageUrl = statusResult.data.data.images[0].url;
            return new Response(JSON.stringify({
              data: { images: [{ url: imageUrl }] }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else if (statusResult.data && statusResult.data.state === 'failed') {
            throw new Error('Image generation failed: ' + (statusResult.data.msg || 'Unknown error'));
          }
          // If state is 'processing', continue loop
        }
        
        attempts++;
      }
      
      throw new Error('Generation timeout - please try again');
    } else if (result.images) {
      return new Response(JSON.stringify({
        data: { images: result.images }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Unexpected API response format');
    }

  } catch (error) {
    console.error('Multi-view generation error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'MULTI_VIEW_GENERATION_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});