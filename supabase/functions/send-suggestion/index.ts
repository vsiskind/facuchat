/// <reference types="https://esm.sh/v135/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Deno expects the .ts extension
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const TO_EMAIL_ADDRESS = 'valentinsiskind@gmail.com'; // Your email
const FROM_EMAIL_ADDRESS = 'onboarding@resend.dev'; // Resend's test address (replace with verified domain later)

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure API key is available
    if (!RESEND_API_KEY) {
      throw new Error('Missing RESEND_API_KEY environment variable.');
    }

    // Parse request body
    let suggestionText = 'No suggestion text provided.';
    let userId = 'Anonymous';
    try {
      const body = await req.json();
      suggestionText = body.suggestion_text || suggestionText;
      userId = body.user_id || userId; // Get user ID if passed
    } catch (error) {
      console.warn('Could not parse request body or missing fields:', error);
      // Proceed with default values if parsing fails or fields are missing
    }


    // Construct email payload
    const emailPayload = {
      from: FROM_EMAIL_ADDRESS,
      to: [TO_EMAIL_ADDRESS],
      subject: 'New App Suggestion',
      html: `
        <h1>New Suggestion Received</h1>
        <p><strong>Suggestion:</strong></p>
        <p>${suggestionText}</p>
      `,
    };

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    // Check Resend response
    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error('Resend API error:', resendResponse.status, errorBody);
      throw new Error(`Resend API Error: ${resendResponse.status} ${errorBody}`);
    }

    const data = await resendResponse.json();

    // Return success response
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) { // Explicitly type error
    console.error('Error processing request:', error);
    // Return error response
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
