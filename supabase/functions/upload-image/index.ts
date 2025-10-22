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
    const { imageData, fileName } = await req.json();

    if (!imageData || !fileName) {
      throw new Error('Image data and filename are required');
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }

    // Extract base64 data from data URL
    const base64Data = imageData.split(',')[1];
    const mimeType = imageData.split(';')[0].split(':')[1];

    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate storage path with timestamp (ASCII only)
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
    const storagePath = `uploads/${timestamp}-${cleanFileName}`;

    // Upload to Supabase Storage
    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/banana-ai-images/${storagePath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': mimeType,
        'x-upsert': 'true'
      },
      body: binaryData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    // Get public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/banana-ai-images/${storagePath}`;

    return new Response(JSON.stringify({
      data: { publicUrl, storagePath }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Image upload error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'IMAGE_UPLOAD_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});