import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, contentType, language, tone, platform } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating content:', { contentType, language, tone, platform });

    // Build the system prompt based on content type
    let systemPrompt = `You are a professional marketing content writer for African SMEs. `;
    
    switch (contentType) {
      case 'caption':
        systemPrompt += `Write engaging social media captions that resonate with African audiences. Be culturally aware and use appropriate local references when relevant.`;
        break;
      case 'description':
        systemPrompt += `Write compelling product or service descriptions that highlight value propositions for African markets.`;
        break;
      case 'email':
        systemPrompt += `Write professional marketing emails suitable for business communication in Africa. Include subject line and body.`;
        break;
      case 'sms':
        systemPrompt += `Write concise SMS marketing messages (max 160 characters). Be direct and include a clear call-to-action.`;
        break;
      case 'blog':
        systemPrompt += `Write informative blog posts that provide value to African business audiences.`;
        break;
      case 'ad_copy':
        systemPrompt += `Write persuasive advertising copy for digital campaigns targeting African consumers.`;
        break;
      case 'hashtags':
        systemPrompt += `Generate relevant hashtags for social media posts. Include a mix of popular and niche hashtags relevant to African markets.`;
        break;
      default:
        systemPrompt += `Write professional marketing content suitable for African businesses.`;
    }

    // Add tone instructions
    systemPrompt += ` Tone: ${tone || 'professional'}.`;

    // Add language instructions
    if (language === 'sw') {
      systemPrompt += ` Write in Swahili.`;
    } else if (language === 'sheng') {
      systemPrompt += ` Write in Sheng (Kenyan urban slang).`;
    } else {
      systemPrompt += ` Write in English.`;
    }

    // Add platform-specific instructions
    if (platform) {
      systemPrompt += ` Optimize for ${platform}.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('AI Gateway error:', errorData);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens || 0;

    console.log('Content generated successfully, tokens used:', tokensUsed);

    return new Response(
      JSON.stringify({ 
        content: generatedContent,
        tokensUsed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-content function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
