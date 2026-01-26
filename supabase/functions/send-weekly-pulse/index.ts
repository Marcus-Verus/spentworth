// Supabase Edge Function for sending weekly pulse emails
// Only sends if there's something actionable (stale data OR pending items)
// Deploy: supabase functions deploy send-weekly-pulse
// Test: supabase functions invoke send-weekly-pulse

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Thresholds for when to send
const UPLOAD_THRESHOLD_DAYS = 7  // Days since last import before nudging
const INBOX_THRESHOLD_ITEMS = 3  // Pending items before nudging

interface PulseData {
  daysSinceUpload: number | null
  pendingItems: number
  shouldSend: boolean
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const resend = new Resend(resendApiKey)

    const now = new Date()
    const currentDayOfWeek = now.getDay() // 0=Sunday, 1=Monday, etc.

    // Find users who have weekly pulse enabled and it's their preferred day
    const { data: users, error: fetchError } = await supabase
      .from('notification_prefs')
      .select('user_id, weekly_pulse_day, weekly_pulse_last_sent, daily_brief_timezone')
      .eq('weekly_pulse_enabled', true)

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`)
    }

    let sentCount = 0
    let skippedCount = 0
    let nothingActionableCount = 0
    let errorCount = 0

    for (const prefs of users || []) {
      try {
        // Check if today is the user's preferred day
        const userTimezone = prefs.daily_brief_timezone || 'America/New_York'
        const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
        const userDayOfWeek = userLocalTime.getDay()

        if (userDayOfWeek !== prefs.weekly_pulse_day) {
          skippedCount++
          continue // Not the right day for this user
        }

        // Check if we already sent this week (in user's timezone)
        if (prefs.weekly_pulse_last_sent) {
          const lastSent = new Date(prefs.weekly_pulse_last_sent)
          const lastSentLocal = new Date(lastSent.toLocaleString('en-US', { timeZone: userTimezone }))
          
          // Get the week number (simple check: within last 6 days)
          const daysSinceLastPulse = Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24))
          if (daysSinceLastPulse < 6) {
            skippedCount++
            continue // Already sent this week
          }
        }

        // Check if there's anything actionable
        const pulseData = await getPulseData(supabase, prefs.user_id)
        
        if (!pulseData.shouldSend) {
          nothingActionableCount++
          continue // Nothing actionable, skip this user
        }

        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(prefs.user_id)
        if (!userData?.user?.email) continue

        const userEmail = userData.user.email
        const userName = userData.user.user_metadata?.full_name || userEmail.split('@')[0]

        // Send email
        const { error: sendError } = await resend.emails.send({
          from: 'SpentWorth <hello@spentworth.com>',
          to: userEmail,
          subject: generateSubject(pulseData),
          html: generateEmailHtml(userName, pulseData)
        })

        if (sendError) {
          console.error(`Failed to send to ${userEmail}:`, sendError)
          errorCount++
          continue
        }

        // Update last sent timestamp
        await supabase
          .from('notification_prefs')
          .update({ weekly_pulse_last_sent: now.toISOString() })
          .eq('user_id', prefs.user_id)

        sentCount++
      } catch (e) {
        console.error(`Error processing user ${prefs.user_id}:`, e)
        errorCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        sent: sentCount, 
        skipped: skippedCount,
        nothingActionable: nothingActionableCount,
        errors: errorCount, 
        total: users?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Weekly pulse error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getPulseData(supabase: any, userId: string): Promise<PulseData> {
  const now = new Date()

  // Get days since last upload
  const { data: lastImport } = await supabase
    .from('import_batches')
    .select('uploaded_at')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single()

  let daysSinceUpload: number | null = null
  if (lastImport?.uploaded_at) {
    const lastUploadDate = new Date(lastImport.uploaded_at)
    daysSinceUpload = Math.floor((now.getTime() - lastUploadDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Get pending review items
  const { count: pendingItems } = await supabase
    .from('review_inbox')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')

  // Determine if we should send
  const needsUpload = daysSinceUpload === null || daysSinceUpload >= UPLOAD_THRESHOLD_DAYS
  const hasPendingItems = (pendingItems || 0) >= INBOX_THRESHOLD_ITEMS
  const shouldSend = needsUpload || hasPendingItems

  return {
    daysSinceUpload,
    pendingItems: pendingItems || 0,
    shouldSend
  }
}

function generateSubject(data: PulseData): string {
  const needsUpload = data.daysSinceUpload === null || data.daysSinceUpload >= UPLOAD_THRESHOLD_DAYS
  
  if (needsUpload && data.daysSinceUpload !== null) {
    return `📬 Quick pulse: ${data.daysSinceUpload} days since your last upload`
  } else if (needsUpload) {
    return `📬 Quick pulse: Time to upload your first data!`
  }
  return `📬 Quick pulse: ${data.pendingItems} items waiting`
}

function generateEmailHtml(name: string, data: PulseData): string {
  const needsUpload = data.daysSinceUpload === null || data.daysSinceUpload >= UPLOAD_THRESHOLD_DAYS
  const hasPendingItems = data.pendingItems >= INBOX_THRESHOLD_ITEMS

  // Determine main message
  let mainMessage: string
  let ctaUrl: string
  let ctaText: string

  if (needsUpload && hasPendingItems) {
    mainMessage = `Your spending data is getting stale and you've got items piling up. A quick refresh will get you back on track.`
    ctaUrl = 'https://spentworth.com/imports'
    ctaText = 'Upload Fresh Data →'
  } else if (needsUpload) {
    mainMessage = data.daysSinceUpload === null
      ? `Ready to get started? Upload your first batch of transactions and watch your spending insights come to life.`
      : `It's been a little while since you uploaded spending data. Your insights work best with fresh numbers.`
    ctaUrl = 'https://spentworth.com/imports'
    ctaText = 'Upload Now →'
  } else {
    mainMessage = `You've got some items waiting for your attention. A few quick decisions and you're all caught up.`
    ctaUrl = 'https://spentworth.com/review'
    ctaText = 'Review Inbox →'
  }

  // Generate inbox description
  let inboxDescription = 'Quick categorizations and rule suggestions'
  if (data.pendingItems >= 10) {
    inboxDescription = 'Clearing these keeps your data accurate'
  } else if (data.pendingItems >= 5) {
    inboxDescription = 'Just a few minutes to clear the queue'
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f0e8; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 520px; background: #ffffff; border-radius: 20px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: #0d9488; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">
                👋 Quick check-in, ${name}
              </h1>
            </td>
          </tr>
          
          <!-- Main Message -->
          <tr>
            <td style="padding: 28px 28px 16px;">
              <p style="margin: 0; font-size: 16px; color: #171717; line-height: 1.6;">
                ${mainMessage}
              </p>
            </td>
          </tr>
          
          ${needsUpload && data.daysSinceUpload !== null ? `
          <!-- Upload Nudge -->
          <tr>
            <td style="padding: 8px 28px 16px;">
              <div style="padding: 16px 20px; background: #fef3c7; border-radius: 12px;">
                <p style="margin: 0; font-size: 15px;">
                  <span style="font-size: 18px; margin-right: 8px;">📤</span>
                  <strong style="color: #92400e;">${data.daysSinceUpload} days</strong>
                  <span style="color: #92400e;"> since your last import</span>
                  <br>
                  <span style="font-size: 14px; color: #b45309;">Fresh data = better insights. Takes 2 minutes.</span>
                </p>
              </div>
            </td>
          </tr>
          ` : needsUpload ? `
          <!-- First Upload Nudge -->
          <tr>
            <td style="padding: 8px 28px 16px;">
              <div style="padding: 16px 20px; background: #f0fdf4; border-radius: 12px;">
                <p style="margin: 0; font-size: 15px;">
                  <span style="font-size: 18px; margin-right: 8px;">🚀</span>
                  <strong style="color: #15803d;">No data yet</strong>
                  <br>
                  <span style="font-size: 14px; color: #16a34a;">Upload a CSV from your bank to get started.</span>
                </p>
              </div>
            </td>
          </tr>
          ` : ''}
          
          ${hasPendingItems ? `
          <!-- Inbox Items -->
          <tr>
            <td style="padding: 8px 28px 16px;">
              <div style="padding: 16px 20px; background: #eff6ff; border-radius: 12px;">
                <p style="margin: 0; font-size: 15px;">
                  <span style="font-size: 18px; margin-right: 8px;">📥</span>
                  <strong style="color: #1d4ed8;">${data.pendingItems} items</strong>
                  <span style="color: #1d4ed8;"> waiting in your inbox</span>
                  <br>
                  <span style="font-size: 14px; color: #2563eb;">${inboxDescription}</span>
                </p>
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- CTA -->
          <tr>
            <td style="padding: 16px 28px 28px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; padding: 14px 28px; background: #0d9488; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                ${ctaText}
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px 28px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                <a href="https://spentworth.com/dashboard" style="color: #0d9488; font-weight: 500;">Dashboard</a> · 
                <a href="https://spentworth.com/settings#notifications" style="color: #9ca3af;">Manage emails</a>
              </p>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">
                You're getting this because you haven't checked in lately.<br>
                <a href="https://spentworth.com/settings#notifications" style="color: #9ca3af;">Unsubscribe from weekly pulse</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

