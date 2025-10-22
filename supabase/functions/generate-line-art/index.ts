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
    const { imageUrl, lineArtType } = await req.json();

    if (!imageUrl || !lineArtType) {
      throw new Error('Image URL and line art type are required');
    }

    const duomiApiKey = Deno.env.get('DUOMI_API_KEY');
    if (!duomiApiKey) {
      throw new Error('DUOMI_API_KEY not configured');
    }

    // Build prompt based on type
    let prompt = '';
    if (lineArtType === 'technical') {
      prompt = 'Convert the image in [Image1] into a technical line drawing. Use clean, precise lines with consistent thickness. Focus on structural details and proportions. Remove all colors and shading, keeping only black outlines on a white background. High-resolution, blueprint-style technical illustration.';
    } else if (lineArtType === 'concept') {
      prompt = 'Convert the image in [Image1] into an artistic concept sketch. Use expressive, flowing lines with varied thickness. Capture the essence and character rather than precise details. Remove all colors, keeping only black ink-style outlines on white background. Artistic, hand-drawn concept art style.';
    } else {
      throw new Error('Invalid line art type. Must be "technical" or "concept"');
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
        image_urls: [imageUrl],
        aspect_ratio: '1:1'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Duomi API failed: ${errorText}`);
    }

    const result = await response.json();
    
    // Check if we got a task_id (async mode)
    if (result.data && result.data.task_id) {
      // Poll for result
      const taskId = result.data.task_id;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
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
      // Direct result (sync mode)
      return new Response(JSON.stringify({
        data: { images: result.images }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Unexpected API response format');
    }

  } catch (error) {
    console.error('Line art generation error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'LINE_ART_GENERATION_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});