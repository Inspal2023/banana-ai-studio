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
    const { imageUrl, mode, textPrompt, backgroundUrl } = await req.json();

    if (!imageUrl || !mode) {
      throw new Error('Image URL and mode are required');
    }

    const duomiApiKey = Deno.env.get('DUOMI_API_KEY');
    if (!duomiApiKey) {
      throw new Error('DUOMI_API_KEY not configured');
    }

    let prompt = '';
    let imageUrls = [imageUrl];

    // Build prompt based on mode
    if (mode === 'text') {
      if (!textPrompt) {
        throw new Error('Text prompt is required for text mode');
      }
      prompt = `Replace the background of [Image1] with ${textPrompt}. Keep the main subject (product/person) completely unchanged, maintaining original: Size and proportions, Lighting and shadows, Colors and materials, Pose and orientation. Ensure the subject blends naturally with the new environment. Match lighting direction and color temperature. Photorealistic, high-resolution, seamless integration.`;
    } else if (mode === 'image') {
      if (!backgroundUrl) {
        throw new Error('Background URL is required for image mode');
      }
      prompt = 'Take the main subject from [Image1] and place it into the background scene from [Image2]. Keep the subject from Image1 completely unchanged. Adjust lighting, shadows, and color temperature to match Image2 environment. Ensure the subject blends naturally with perspective and depth of field. Photorealistic, seamless integration, high-resolution.';
      imageUrls = [imageUrl, backgroundUrl];
    } else if (mode === 'hybrid') {
      if (!backgroundUrl || !textPrompt) {
        throw new Error('Both background URL and text prompt are required for hybrid mode');
      }
      prompt = `Take the main subject from [Image1] and place it into the background from [Image2], but modify the background with these changes: ${textPrompt}. Keep the subject from Image1 unchanged. Apply the described modifications to the Image2 background. Adjust lighting, shadows, and colors for natural integration. Photorealistic, high-resolution, seamless blending.`;
      imageUrls = [imageUrl, backgroundUrl];
    } else {
      throw new Error('Invalid mode. Must be "text", "image", or "hybrid"');
    }

    // Call Duomi API
    const response = await fetch('https://duomiapi.com/api/gemini/nano-banana-edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': duomiApiKey
      },
      body: JSON.stringify({
        prompt: prompt,
        image_urls: imageUrls,
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
    console.error('Background replacement error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'BACKGROUND_REPLACEMENT_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});