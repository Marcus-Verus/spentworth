// Supabase Edge Function for sending daily brief emails
// Deploy: supabase functions deploy send-daily-briefs
// Test: supabase functions invoke send-daily-briefs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DailyBriefData {
  currentMonthSpent: number
  projectedMonthSpend: number
  budgetTotal: number
  paceStatus: 'on_track' | 'ahead' | 'behind'
  daysRemaining: number
  topCategoryThisWeek: { category: string; spent: number } | null
  pendingReviewItems: number
  daysSinceLastUpload: number | null
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const resend = new Resend(resendApiKey)

    const now = new Date()

    // Find users who have daily brief enabled
    const { data: users, error: fetchError } = await supabase
      .from('notification_prefs')
      .select('user_id, daily_brief_time, daily_brief_timezone, daily_brief_last_sent')
      .eq('daily_brief_enabled', true)

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`)
    }

    let sentCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const prefs of users || []) {
      try {
        // Check if it's the right time in the user's timezone
        const userTimezone = prefs.daily_brief_timezone || 'America/New_York'
        const preferredTime = prefs.daily_brief_time || '09:00:00' // Default 9:00 AM
        
        // Get current time in user's timezone
        const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
        const userHour = userLocalTime.getHours()
        
        // Parse preferred time (HH:MM:SS format) - only check hour since cron runs hourly
        const [prefHour] = preferredTime.split(':').map(Number)
        
        // Check if current hour matches preferred hour
        const isCorrectTime = userHour === prefHour
        
        if (!isCorrectTime) {
          skippedCount++
          continue // Not the right time for this user
        }

        // Check if we already sent today (in user's timezone)
        if (prefs.daily_brief_last_sent) {
          const lastSent = new Date(prefs.daily_brief_last_sent)
          const lastSentLocal = new Date(lastSent.toLocaleString('en-US', { timeZone: userTimezone }))
          
          // Check if last sent was today in user's timezone
          if (lastSentLocal.toDateString() === userLocalTime.toDateString()) {
            skippedCount++
            continue // Already sent today
          }
        }

        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(prefs.user_id)
        if (!userData?.user?.email) continue

        const userEmail = userData.user.email
        const userName = userData.user.user_metadata?.full_name || userEmail.split('@')[0]

        // Generate daily brief data
        const briefData = await generateDailyBriefData(supabase, prefs.user_id)

        // Format currency
        const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

        // Determine pace message
        const paceMessages = {
          on_track: `You're on track! ${briefData.daysRemaining} days left this month.`,
          ahead: `Great job! You're under budget with ${briefData.daysRemaining} days to go.`,
          behind: `Heads up: You're trending over budget. ${briefData.daysRemaining} days left.`
        }

        // Send email via Resend
        const { error: sendError } = await resend.emails.send({
          from: 'SpentWorth <hello@spentworth.com>',
          to: userEmail,
          subject: `📊 Daily Brief: ${fmt(briefData.currentMonthSpent)} spent this month`,
          html: generateEmailHtml({
            name: userName,
            ...briefData,
            paceMessage: paceMessages[briefData.paceStatus]
          })
        })

        if (sendError) {
          console.error(`Failed to send to ${userEmail}:`, sendError)
          errorCount++
          continue
        }

        // Update last sent timestamp
        await supabase
          .from('notification_prefs')
          .update({ daily_brief_last_sent: now.toISOString() })
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
        errors: errorCount, 
        total: users?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Daily brief error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateDailyBriefData(supabase: any, userId: string): Promise<DailyBriefData> {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - dayOfMonth

  // Get current month spending
  const startOfMonth = `${currentMonth}-01`
  const { data: monthlyTx } = await supabase
    .from('transactions')
    .select('amount, category')
    .eq('user_id', userId)
    .eq('included_in_spend', true)
    .gte('date', startOfMonth)
    .lte('date', now.toISOString().slice(0, 10))

  const currentMonthSpent = (monthlyTx || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
  const dailyAvg = dayOfMonth > 0 ? currentMonthSpent / dayOfMonth : 0
  const projectedMonthSpend = dailyAvg * daysInMonth

  // Get budget total
  const { data: budgets } = await supabase
    .from('budgets')
    .select('monthly_limit')
    .eq('user_id', userId)
    .eq('enabled', true)

  const budgetTotal = (budgets || []).reduce((sum: number, b: any) => sum + b.monthly_limit, 0)

  // Determine pace status
  let paceStatus: 'on_track' | 'ahead' | 'behind' = 'on_track'
  if (budgetTotal > 0) {
    const expectedSpend = (budgetTotal / daysInMonth) * dayOfMonth
    if (currentMonthSpent < expectedSpend * 0.9) paceStatus = 'ahead'
    else if (currentMonthSpent > expectedSpend * 1.1) paceStatus = 'behind'
  }

  // Get top category this week
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: weeklyTx } = await supabase
    .from('transactions')
    .select('amount, category')
    .eq('user_id', userId)
    .eq('included_in_spend', true)
    .gte('date', weekAgo)

  const categorySpend = new Map<string, number>()
  for (const tx of weeklyTx || []) {
    const cat = tx.category || 'Uncategorized'
    categorySpend.set(cat, (categorySpend.get(cat) || 0) + Math.abs(tx.amount))
  }

  let topCategoryThisWeek: { category: string; spent: number } | null = null
  let maxSpend = 0
  for (const [category, spent] of categorySpend) {
    if (spent > maxSpend) {
      maxSpend = spent
      topCategoryThisWeek = { category, spent }
    }
  }

  // Get pending review items
  const { count: pendingReviewItems } = await supabase
    .from('review_inbox')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')

  // Get days since last upload
  const { data: lastImport } = await supabase
    .from('import_batches')
    .select('uploaded_at')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single()

  let daysSinceLastUpload: number | null = null
  if (lastImport?.uploaded_at) {
    const lastUploadDate = new Date(lastImport.uploaded_at)
    daysSinceLastUpload = Math.floor((now.getTime() - lastUploadDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  return {
    currentMonthSpent: Math.round(currentMonthSpent),
    projectedMonthSpend: Math.round(projectedMonthSpend),
    budgetTotal: Math.round(budgetTotal),
    paceStatus,
    daysRemaining,
    topCategoryThisWeek,
    pendingReviewItems: pendingReviewItems || 0,
    daysSinceLastUpload
  }
}

function generateEmailHtml(data: {
  name: string
  currentMonthSpent: number
  projectedMonthSpend: number
  budgetTotal: number
  paceStatus: string
  paceMessage: string
  daysRemaining: number
  topCategoryThisWeek: { category: string; spent: number } | null
  pendingReviewItems: number
  daysSinceLastUpload: number | null
}): string {
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString()
  const paceColor = data.paceStatus === 'ahead' ? '#10b981' : data.paceStatus === 'behind' ? '#f59e0b' : '#0d9488'

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
        <table width="100%" style="max-width: 600px; background: #ffffff; border-radius: 20px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: #0d9488; padding: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.7); font-size: 14px;">
                ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                Good morning, ${data.name}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 15px;">
                Here's your daily spending brief
              </p>
            </td>
          </tr>
          
          <!-- Stats -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">
                <strong style="color: #171717;">Monthly Pace</strong>
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align: center;">
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #171717;">${fmt(data.currentMonthSpent)}</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #737373; text-transform: uppercase;">Spent</p>
                  </td>
                  <td width="33%" style="text-align: center;">
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${paceColor};">${fmt(data.projectedMonthSpend)}</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #737373; text-transform: uppercase;">Projected</p>
                  </td>
                  <td width="33%" style="text-align: center;">
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #171717;">${data.budgetTotal > 0 ? fmt(data.budgetTotal) : '—'}</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #737373; text-transform: uppercase;">Budget</p>
                  </td>
                </tr>
              </table>
              
              <!-- Pace Message -->
              <div style="margin-top: 24px; padding: 12px 16px; background: ${data.paceStatus === 'behind' ? '#fef3c7' : '#f0fdf4'}; border-radius: 10px; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: ${data.paceStatus === 'behind' ? '#92400e' : '#15803d'};">
                  ${data.paceMessage}
                </p>
              </div>
            </td>
          </tr>
          
          ${data.topCategoryThisWeek ? `
          <!-- Top Category -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="padding: 16px; background: #f5f0e8; border-radius: 12px;">
                <p style="margin: 0; font-size: 15px; color: #171717;">
                  📊 <strong>Top category this week:</strong> ${data.topCategoryThisWeek.category}
                  <br><span style="color: #737373; font-size: 14px;">${fmt(data.topCategoryThisWeek.spent)} spent</span>
                </p>
              </div>
            </td>
          </tr>
          ` : ''}
          
          ${data.pendingReviewItems > 0 ? `
          <!-- Review Inbox CTA -->
          <tr>
            <td style="padding: 0 32px 24px; text-align: center;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #171717;">
                <strong>${data.pendingReviewItems} items</strong> in your Review Inbox
              </p>
              <a href="https://spentworth.com/review" style="display: inline-block; padding: 14px 32px; background: #0d9488; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                Clear 5 Items →
              </a>
            </td>
          </tr>
          ` : ''}
          
          ${data.daysSinceLastUpload !== null && data.daysSinceLastUpload >= 7 ? `
          <!-- Upload Nudge -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="padding: 16px 20px; background: #f5f0e8; border-radius: 12px;">
                <p style="margin: 0; font-size: 14px; color: #171717;">
                  📤 <strong>Time to upload?</strong> It's been ${data.daysSinceLastUpload} days since your last import.
                  <br><a href="https://spentworth.com/imports" style="color: #0d9488; font-weight: 600;">Upload now</a> for fresh insights.
                </p>
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                <a href="https://spentworth.com/dashboard" style="color: #0d9488; font-weight: 500;">View Dashboard</a> · 
                <a href="https://spentworth.com/settings#notifications" style="color: #9ca3af;">Email Settings</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} SpentWorth. All rights reserved.
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

