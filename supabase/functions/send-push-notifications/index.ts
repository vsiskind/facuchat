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
      return new Response('Ignoring event', { status: 200 })
    }

    const notification = payload.record // The newly inserted notification row
    // 4. Fetch the recipient's push token and notification preferences
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('push_token, notify_like_milestone_post, notify_like_milestone_comment, notify_comment_milestone_post, notify_reply_to_comment') // Fetch preferences
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

    // 5. Check notification preferences based on type
    const notificationType = notification.type as keyof typeof messageTemplates;
    let shouldSend = true; // Default to true

    switch (notificationType) {
      case 'like_milestone_post':
        shouldSend = profile.notify_like_milestone_post ?? true; // Default to true if null
        break;
      case 'like_milestone_comment':
        shouldSend = profile.notify_like_milestone_comment ?? true;
        break;
      case 'comment_milestone_post':
        shouldSend = profile.notify_comment_milestone_post ?? true;
        break;
      case 'reply_to_comment':
        shouldSend = profile.notify_reply_to_comment ?? true;
        break;
      // Add cases for other notification types if needed
      default:
        // Unknown type, maybe send anyway or log?
        console.warn(`Unknown notification type '${notificationType}' for preference check.`);
        break;
    }

    if (!shouldSend) {
      // Update notification status to indicate skipped due to preference
      await supabaseClient
        .from('notifications')
        .update({ push_sent_at: new Date().toISOString() }) // Mark as processed
        .eq('id', notification.id)
      return new Response('Notification skipped due to user preference', { status: 200 })
    }

    // 6. Validate the push token
    const pushToken = profile.push_token
    if (!pushToken || typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken')) {
      console.error(`Invalid Expo push token format for user ${notification.user_id}: ${pushToken}`)
      // Optionally update notification status to 'invalid_token'
      await supabaseClient
        .from('notifications')
        .update({ push_sent_at: new Date().toISOString() }) // Mark as processed
        .eq('id', notification.id)
      return new Response('Invalid push token', { status: 400 })
    }

    // 7. Construct the notification message
    const messageGenerator = messageTemplates[notificationType] // Use already defined notificationType
    const messageBody = messageGenerator
      ? messageGenerator(notification.metadata)
      : 'You have a new notification.' // Fallback message

    const message = {
      to: pushToken,
      sound: 'default' as const, // Cast to literal type
      body: messageBody,
      data: { notificationId: notification.id, type: notificationType, postId: notification.post_id, commentId: notification.comment_id }, // Include relevant IDs
      // title: 'FacuChat', // Optional title
      // badge: 1, // Optional: Set badge count (requires client-side logic)
    }

    // 8. Send the push notification
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

      const tickets = responseBody.data // Assuming success, 'data' contains ticket/receipt info

      // 9. Update the notification status in the database
      const { error: updateError } = await supabaseClient
        .from('notifications')
        .update({ push_sent_at: new Date().toISOString() })
        .eq('id', notification.id)

      if (updateError) {
        console.error(`Error updating notification ${notification.id} status:`, updateError)
        // Don't return error response here, as push might have succeeded
      }

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
