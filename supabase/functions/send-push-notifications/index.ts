// supabase/functions/send-push-notifications/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Removed: import Expo from 'https://esm.sh/expo-server-sdk@3.7.0'

// Removed: const expo = new Expo()

// Define notification message templates
const messageTemplates = {
  like_milestone_post: (metadata: any) => `Your post reached ${metadata?.likes || '?'} likes! 🎉`,
  like_milestone_comment: (metadata: any) => `Your comment reached ${metadata?.likes || '?'} likes! 👍`,
  comment_milestone_post: (metadata: any) => `Your post got ${metadata?.comments || '?'} comments! 💬`,
  reply_to_comment: (_metadata: any) => `Someone replied to your comment! ↩️`,
}

serve(async (req) => {
  console.log('--- send-push-notifications function invoked ---'); // ADDED VERY FIRST LOG

  // 1. Check method and authorization (basic check, enhance as needed)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  // Optional: Add webhook secret verification here for security

  // 2. Initialize Supabase client (ensure env vars are set in Supabase dashboard)
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role key for elevated access
  )

  try {
    // 3. Parse the incoming request body (webhook payload)
    const payload = await req.json()

    // Check if it's an INSERT event on the notifications table
    if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
      console.log('Ignoring non-notification insert event:', payload.type, payload.table)
      return new Response('Ignoring event', { status: 200 })
    }

    const notification = payload.record // The newly inserted notification row
    console.log('Processing notification:', notification.id)

    // 4. Fetch the recipient's push token
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('push_token')
      .eq('id', notification.user_id)
      .single()

    if (profileError) {
      console.error(`Error fetching profile for user ${notification.user_id}:`, profileError)
      // Optionally update notification status to 'error' here
      return new Response('Error fetching profile', { status: 500 })
    }

    if (!profile?.push_token) {
      console.warn(`No push token found for user ${notification.user_id}. Skipping notification ${notification.id}.`)
      // Update notification status to indicate no token
      await supabaseClient
        .from('notifications')
        .update({ push_sent_at: new Date().toISOString() }) // Mark as processed even if no token
        .eq('id', notification.id)
      return new Response('No push token found', { status: 200 })
    }

    const pushToken = profile.push_token

    // 5. Validate the push token (Basic check, Expo SDK provided more robust validation)
    // You might want to add more checks here if needed, e.g., regex for "ExponentPushToken[...]"
    if (!pushToken || typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken')) {
      console.error(`Invalid Expo push token format for user ${notification.user_id}: ${pushToken}`)
      // Optionally update notification status to 'invalid_token'
      await supabaseClient
        .from('notifications')
        .update({ push_sent_at: new Date().toISOString() }) // Mark as processed
        .eq('id', notification.id)
      return new Response('Invalid push token', { status: 400 })
    }

    // 6. Construct the notification message
    const messageGenerator = messageTemplates[notification.type as keyof typeof messageTemplates]
    const messageBody = messageGenerator
      ? messageGenerator(notification.metadata)
      : 'You have a new notification.' // Fallback message

    const message = {
      to: pushToken,
      sound: 'default' as const, // Cast to literal type
      body: messageBody,
      data: { notificationId: notification.id, type: notification.type, postId: notification.post_id, commentId: notification.comment_id }, // Include relevant IDs
      // title: 'FacuChat', // Optional title
      // badge: 1, // Optional: Set badge count (requires client-side logic)
    }

    // 7. Send the push notification
    console.log(`Sending push notification to token: ${pushToken}`)
    try {
      // Use Deno's native fetch to call Expo API directly
      const expoApiUrl = 'https://exp.host/--/api/v2/push/send'
      const response = await fetch(expoApiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          // Add 'host' if required by Expo, though usually not needed with fetch
          // 'host': 'exp.host'
        },
        body: JSON.stringify([message]), // Send message as an array, even if just one
      })

      const responseBody = await response.json() // Expo returns { data: [...] } or { errors: [...] }

      if (!response.ok || responseBody.errors) {
        console.error(`Error response from Expo API for notification ${notification.id}:`, response.status, responseBody)
        // Optionally update notification status to 'send_error'
        // Consider handling specific errors like DeviceNotRegistered here based on responseBody
        return new Response('Error sending push notification via Expo API', { status: response.status })
      }

      console.log(`Expo API response for notification ${notification.id}:`, responseBody)
      const tickets = responseBody.data // Assuming success, 'data' contains ticket/receipt info

      // 8. Update the notification status in the database
      const { error: updateError } = await supabaseClient
        .from('notifications')
        .update({ push_sent_at: new Date().toISOString() })
        .eq('id', notification.id)

      if (updateError) {
        console.error(`Error updating notification ${notification.id} status:`, updateError)
        // Don't return error response here, as push might have succeeded
      }

      console.log(`Successfully processed and sent notification ${notification.id}`)
      return new Response(JSON.stringify({ success: true, tickets }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })

    } catch (error) {
      console.error(`Error sending push notification for ${notification.id}:`, error)
      // Optionally update notification status to 'send_error'
      return new Response('Error sending push notification', { status: 500 })
    }

  } catch (error) {
    console.error('General error processing webhook:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

/*
Setup Steps:
1. Deploy this function: `supabase functions deploy send-push-notifications --no-verify-jwt`
   (You might need to install Supabase CLI: `npm i -g supabase`)
2. Set Environment Variables in Supabase Dashboard (Project > Settings > Functions > send-push-notifications):
   - SUPABASE_URL: Your project URL
   - SUPABASE_SERVICE_ROLE_KEY: Your project's service_role key
3. Create Database Webhook in Supabase Dashboard (Project > Database > Webhooks):
   - Name: Send Push Notification Trigger
   - Table: notifications
   - Events: INSERT
   - Function: send-push-notifications (select the deployed function)
   - HTTP Method: POST
   - Optional: Add a secret in Headers (e.g., `Authorization: Bearer YOUR_SECRET`) and verify it in the function.
*/
