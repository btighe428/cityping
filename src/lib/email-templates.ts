// Email Templates for CityPing
// Personality: Your parking buddy — a friend who's got your back on NYC streets
// See: docs/PARKPING_TONE_GUIDE.md

import type { MonthlyInsights } from './monthly-insights'

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  color: #1e3a5f;
`

const buttonStyle = `
  display: inline-block;
  background-color: #1e3a5f;
  color: white;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
`

// --- Copy Variation Helpers ---

function getGoodNewsLine(holidayName: string, consecutiveDays?: number): string {
  // Holiday-specific greetings
  const lower = holidayName.toLowerCase()

  if (lower.includes('christmas')) return '🎄 Happy holidays!'
  if (lower.includes('new year') && lower.includes('eve')) return '🎉 Ring in the new year!'
  if (lower.includes('new year')) return '🎉 Happy New Year!'
  if (lower.includes('thanksgiving')) return '🦃 Happy Thanksgiving!'
  if (lower.includes('lunar new year')) return '🧧 新年快乐!'
  if (lower.includes('independence') || lower.includes('july 4')) return '🇺🇸 Happy 4th!'
  if (lower.includes('passover')) return '✡️ Chag Sameach!'
  if (lower.includes('easter') || lower.includes('good friday') || lower.includes('holy thursday')) return '🐣 Happy Easter weekend!'
  if (lower.includes('eid') || lower.includes('idul')) return '🌙 Eid Mubarak!'
  if (lower.includes('diwali')) return '🪔 Happy Diwali!'

  // Consecutive days messaging
  if (consecutiveDays && consecutiveDays >= 4) return '🎉 Extended break!'
  if (consecutiveDays && consecutiveDays >= 2) return '🎉 Back-to-back!'

  // Default variations (rotate based on day of month)
  const variations = [
    '🎉 Good news!',
    '🎉 You\'re in luck!',
    '🎉 Heads up!',
    '🎉 Quick heads up!',
  ]
  const dayOfMonth = new Date().getDate()
  return variations[dayOfMonth % variations.length]
}

function getActionLine(consecutiveDays?: number): { html: string; text: string } {
  if (consecutiveDays && consecutiveDays >= 4) {
    return {
      html: `Park it and forget it — <strong>${consecutiveDays} days</strong> of freedom ahead.`,
      text: `Park it and forget it — ${consecutiveDays} days of freedom ahead.`
    }
  }
  if (consecutiveDays && consecutiveDays >= 2) {
    return {
      html: `Leave it where it is. You've got <strong>${consecutiveDays} days</strong>.`,
      text: `Leave it where it is. You've got ${consecutiveDays} days.`
    }
  }

  // Default variations
  const variations = [
    { html: 'No need to move your car tonight. Sleep in! 😴', text: 'No need to move your car tonight. Sleep in!' },
    { html: 'Your car can stay put tonight. 😴', text: 'Your car can stay put tonight.' },
    { html: 'Skip the shuffle tonight. 😴', text: 'Skip the shuffle tonight.' },
    { html: 'Leave it where it is. One less thing to worry about.', text: 'Leave it where it is. One less thing to worry about.' },
  ]
  const dayOfMonth = new Date().getDate()
  return variations[dayOfMonth % variations.length]
}

function getWeeklyIntro(count: number): string {
  if (count >= 5) return `Big week ahead — <strong>${count} days</strong> where your car can stay put:`
  if (count >= 3) return `Solid week coming up — <strong>${count} days</strong> off from the shuffle:`
  if (count === 2) return `<strong>2 days</strong> this week where you won't need to move:`
  return `Just <strong>1 day</strong> this week, but hey — it counts:`
}

function getMonthlyIntro(count: number, monthName: string): string {
  if (count >= 8) return `Big month for parking freedom — <strong>${count} suspension days</strong> ahead.`
  if (count >= 5) return `Solid month coming up — <strong>${count} days</strong> where your car can stay put.`
  if (count >= 3) return `<strong>${count} suspension days</strong> this month. Here's the breakdown.`
  if (count === 2) return `Quiet month. Just <strong>2 days</strong> to note.`
  if (count === 1) return `Light month — only <strong>1 suspension day</strong> in ${monthName}.`
  return `No suspensions scheduled for ${monthName}. Regular ASP rules apply.`
}

// --- Email Templates ---

export const EMAIL_TEMPLATES = {
  // Monthly start email - comprehensive overview of the month ahead
  monthlyStart: (
    insightsHtml: string,
    insightsText: string,
    monthName: string,
    year: number,
    totalSuspensions: number,
    manageUrl: string
  ) => ({
    subject: `📅 ${monthName}: ${totalSuspensions} Day${totalSuspensions !== 1 ? 's' : ''} You Won't Need to Move`,
    html: `
      <div style="${baseStyle}">
        ${insightsHtml}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="font-size: 14px; color: #64748b; text-align: center;">
          We'll remind you the evening before each suspension.<br />
          <a href="${manageUrl}" style="color: #1e3a5f;">Manage preferences</a> ·
          <a href="https://cityping.net" style="color: #1e3a5f;">cityping.net</a>
        </p>
      </div>
    `,
    text: `${insightsText}

---
We'll remind you the evening before each.
Manage preferences: ${manageUrl}
`,
  }),

  // Welcome email after signup (legacy - use welcomeWithWeekAhead instead)
  welcome: (manageUrl: string) => ({
    subject: 'Welcome to CityPing 🚗',
    html: `
      <div style="${baseStyle}">
        <h1 style="color: #1e3a5f; margin-bottom: 24px;">You're in.</h1>

        <p style="font-size: 18px; line-height: 1.6; margin-bottom: 24px;">
          No more guessing. No more tickets. We'll let you know when you can skip the shuffle.
        </p>

        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0;">
            <strong>Here's the deal:</strong><br />
            The evening before ASP is suspended, you'll get an email (and/or text).
            That's it. No spam, no fluff.
          </p>
        </div>

        <p style="margin: 32px 0;">
          <a href="${manageUrl}" style="${buttonStyle}">View Your Settings</a>
        </p>

        <p style="font-size: 14px; color: #64748b;">
          Questions? Just reply to this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="font-size: 12px; color: #94a3b8;">
          CityPing · NYC Parking Alerts
        </p>
      </div>
    `,
    text: `You're in.

No more guessing. No more tickets. We'll let you know when you can skip the shuffle.

Here's the deal:
The evening before ASP is suspended, you'll get an email (and/or text). That's it. No spam, no fluff.

View your settings: ${manageUrl}

Questions? Just reply to this email.
`,
  }),

  // Combined welcome + week ahead email for new signups
  welcomeWithWeekAhead: (
    weekRange: string,
    suspensions: { date: string; dayOfWeek: string; summary: string; meters?: string; trash?: string; schools?: string }[],
    manageUrl: string,
    subwayAlertsHtml?: string,
    subwayAlertsText?: string
  ) => {
    const hasSuspensions = suspensions.length > 0
    const intro = hasSuspensions ? getWeeklyIntro(suspensions.length) : ''

    return {
      subject: hasSuspensions
        ? `Welcome to CityPing 🚗 — ${suspensions.length} Day${suspensions.length !== 1 ? 's' : ''} Off This Week`
        : 'Welcome to CityPing 🚗 — Your Week Ahead',
      html: `
        <div style="${baseStyle}">
          <!-- Welcome Section -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; color: white;">
            <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
              You're in. 🚗
            </h1>
            <p style="margin: 0; font-size: 18px; opacity: 0.9;">
              No more guessing. No more tickets.
            </p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="font-size: 16px; line-height: 1.6; margin: 0;">
              <strong>Here's the deal:</strong> The evening before ASP is suspended, you'll get an email (and/or text). That's it. No spam, no fluff.
            </p>
          </div>

          <!-- Week Ahead Section -->
          <div style="background: #eff6ff; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1e40af; margin: 0 0 8px 0; font-size: 20px;">
              📅 Week Ahead
            </h2>
            <p style="font-size: 14px; margin: 0; color: #1e40af;">
              ${weekRange}
            </p>
          </div>

          ${hasSuspensions ? `
            <p style="font-size: 18px; line-height: 1.6; margin-bottom: 24px;">
              ${intro}
            </p>

            ${suspensions.map((s, i) => `
              <div style="background: ${i % 2 === 0 ? '#f0fdf4' : '#ffffff'}; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-weight: 600; color: #166534; font-size: 16px;">${s.dayOfWeek}, ${s.date}</span>
                </div>
                <div style="font-size: 15px; color: #1e3a5f; margin-bottom: 8px;">
                  <strong>${s.summary}</strong>
                </div>
                <div style="font-size: 13px; color: #64748b; display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
                  <span>🚗 ASP: <strong style="color: #166534;">Suspended</strong></span>
                  <span>🅿️ Meters: <strong style="color: ${s.meters === 'Suspended' ? '#166534' : '#dc2626'};">${s.meters || 'In Effect'}</strong></span>
                  <span>🗑️ Trash: <strong style="color: ${s.trash === 'Suspended' ? '#166534' : '#64748b'};">${s.trash || 'Normal'}</strong></span>
                  <span>🏫 Schools: <strong style="color: ${s.schools === 'Closed' ? '#166534' : '#64748b'};">${s.schools || 'Open'}</strong></span>
                </div>
              </div>
            `).join('')}
          ` : `
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0; color: #64748b; font-size: 16px;">
                📋 Regular week ahead — ASP and trash collection are on normal schedule.
              </p>
            </div>
          `}

          ${subwayAlertsHtml || ''}

          <p style="font-size: 14px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 24px;">
            We'll remind you the evening before each suspension.
          </p>

          <p style="margin: 32px 0;">
            <a href="${manageUrl}" style="${buttonStyle}">Manage Your Alerts</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

          <p style="font-size: 14px; color: #64748b; text-align: center;">
            Questions? Just reply to this email.<br />
            <a href="${manageUrl}" style="color: #1e3a5f;">Manage preferences</a> ·
            <a href="https://cityping.net" style="color: #1e3a5f;">cityping.net</a>
          </p>
        </div>
      `,
      text: `YOU'RE IN! 🚗

No more guessing. No more tickets. We'll let you know when you can skip the shuffle.

Here's the deal: The evening before ASP is suspended, you'll get an email (and/or text). That's it. No spam, no fluff.

---

📅 WEEK AHEAD: ${weekRange}

${hasSuspensions ? `${suspensions.length} day${suspensions.length !== 1 ? 's' : ''} this week where you can skip the shuffle:

${suspensions.map(s => `• ${s.dayOfWeek}, ${s.date} — ${s.summary}
  🚗 ASP: Suspended | 🅿️ Meters: ${s.meters || 'In Effect'} | 🗑️ Trash: ${s.trash || 'Normal'} | 🏫 Schools: ${s.schools || 'Open'}`).join('\n\n')}` : 'Regular week ahead — ASP and trash collection are on normal schedule.'}

${subwayAlertsText || ''}
We'll remind you the evening before each suspension.

---
Manage your alerts: ${manageUrl}
Questions? Just reply to this email.
`,
    }
  },

  // Suspension reminder - the main product email
  reminder: (
    date: string,
    holidayName: string,
    manageUrl: string,
    tipsHtml?: string,
    tipsText?: string,
    upcomingDays?: { date: string; summary: string }[],
    consecutiveDays?: number
  ) => {
    const goodNews = getGoodNewsLine(holidayName, consecutiveDays)
    const actionLine = getActionLine(consecutiveDays)

    return {
      subject: `🚗 ASP Suspended Tomorrow — ${holidayName}`,
      html: `
        <div style="${baseStyle}">
          <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="color: #166534; margin: 0 0 8px 0; font-size: 24px;">
              ${goodNews}
            </h1>
            <p style="font-size: 18px; margin: 0; color: #166534;">
              Alternate side parking is <strong>suspended</strong> tomorrow.
            </p>
          </div>

          <p style="font-size: 16px; line-height: 1.6;">
            <strong>Tomorrow:</strong> ${date}<br />
            <strong>Reason:</strong> ${holidayName}
          </p>

          <p style="font-size: 18px; line-height: 1.6; background: #fef3c7; padding: 16px; border-radius: 8px;">
            ${actionLine.html}
          </p>

          ${tipsHtml || ''}

          ${upcomingDays && upcomingDays.length > 0 ? `
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; color: #1e3a5f; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
              📅 Coming Up
            </h3>
            ${upcomingDays.map(d => `
              <p style="margin: 8px 0; color: #475569; font-size: 15px;">
                <strong>${d.date}</strong> — ${d.summary}
              </p>
            `).join('')}
          </div>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

          <p style="font-size: 14px; color: #64748b;">
            <a href="${manageUrl}" style="color: #1e3a5f;">Manage preferences</a> ·
            <a href="https://cityping.net" style="color: #1e3a5f;">cityping.net</a>
          </p>
        </div>
      `,
      text: `${goodNews} Alternate side parking is suspended tomorrow.

Tomorrow: ${date}
Reason: ${holidayName}

${actionLine.text}${tipsText || ''}
${upcomingDays && upcomingDays.length > 0 ? `
📅 COMING UP
${upcomingDays.map(d => `• ${d.date} — ${d.summary}`).join('\n')}
` : ''}
---
Manage preferences: ${manageUrl}
`,
    }
  },

  // Weekly preview - sent Sunday morning if there are suspensions this week
  weeklyPreview: (
    weekRange: string,
    suspensions: { date: string; dayOfWeek: string; summary: string; meters?: string; trash?: string; schools?: string }[],
    manageUrl: string
  ) => {
    const intro = getWeeklyIntro(suspensions.length)

    return {
      subject: `📅 This Week: ${suspensions.length} Day${suspensions.length !== 1 ? 's' : ''} You Can Skip the Shuffle`,
      html: `
        <div style="${baseStyle}">
          <div style="background: #eff6ff; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="color: #1e40af; margin: 0 0 8px 0; font-size: 24px;">
              Week Ahead
            </h1>
            <p style="font-size: 16px; margin: 0; color: #1e40af;">
              ${weekRange}
            </p>
          </div>

          <p style="font-size: 18px; line-height: 1.6; margin-bottom: 24px;">
            ${intro}
          </p>

          ${suspensions.map((s, i) => `
            <div style="background: ${i % 2 === 0 ? '#f0fdf4' : '#ffffff'}; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #166534; font-size: 16px;">${s.dayOfWeek}, ${s.date}</span>
              </div>
              <div style="font-size: 15px; color: #1e3a5f; margin-bottom: 8px;">
                <strong>${s.summary}</strong>
              </div>
              <div style="font-size: 13px; color: #64748b; display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
                <span>🚗 ASP: <strong style="color: #166534;">Suspended</strong></span>
                <span>🅿️ Meters: <strong style="color: ${s.meters === 'Suspended' ? '#166534' : '#dc2626'};">${s.meters || 'In Effect'}</strong></span>
                <span>🗑️ Trash: <strong style="color: ${s.trash === 'Suspended' ? '#166534' : '#64748b'};">${s.trash || 'Normal'}</strong></span>
                <span>🏫 Schools: <strong style="color: ${s.schools === 'Closed' ? '#166534' : '#64748b'};">${s.schools || 'Open'}</strong></span>
              </div>
            </div>
          `).join('')}

          <p style="font-size: 14px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 24px;">
            We'll remind you the evening before each.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

          <p style="font-size: 14px; color: #64748b;">
            <a href="${manageUrl}" style="color: #1e3a5f;">Manage preferences</a> ·
            <a href="https://cityping.net" style="color: #1e3a5f;">cityping.net</a>
          </p>
        </div>
      `,
      text: `WEEK AHEAD: ${weekRange}

${suspensions.length} day${suspensions.length !== 1 ? 's' : ''} this week where you can skip the shuffle:

${suspensions.map(s => `• ${s.dayOfWeek}, ${s.date} — ${s.summary}
  🚗 ASP: Suspended | 🅿️ Meters: ${s.meters || 'In Effect'} | 🗑️ Trash: ${s.trash || 'Normal'} | 🏫 Schools: ${s.schools || 'Open'}`).join('\n\n')}

We'll remind you the evening before each.

---
Manage preferences: ${manageUrl}
`,
    }
  },

  // Monthly recap
  monthlyRecap: (
    monthName: string,
    suspensionCount: number,
    highlights: string[],
    nextMonthPreview: string | null,
    manageUrl: string
  ) => ({
    subject: `${monthName} Wrapped — ${suspensionCount} Day${suspensionCount !== 1 ? 's' : ''} You Didn't Have to Move`,
    html: `
      <div style="${baseStyle}">
        <h1 style="color: #1e3a5f; margin-bottom: 24px;">
          ${monthName}, done.
        </h1>

        <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <p style="font-size: 56px; margin: 0; color: #166534; font-weight: bold;">
            ${suspensionCount}
          </p>
          <p style="font-size: 16px; margin: 8px 0 0 0; color: #15803d;">
            day${suspensionCount !== 1 ? 's' : ''} you didn't have to move your car
          </p>
        </div>

        ${highlights.length > 0 ? `
          <p style="font-size: 16px; line-height: 1.6;">
            <strong>Highlights:</strong> ${highlights.join(', ')}
          </p>
        ` : ''}

        ${nextMonthPreview ? `
          <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <p style="font-size: 16px; line-height: 1.6; margin: 0;">
              <strong>Up next:</strong> ${nextMonthPreview}
            </p>
          </div>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="font-size: 14px; color: #64748b;">
          <a href="${manageUrl}" style="color: #1e3a5f;">Manage preferences</a> ·
          <a href="https://cityping.net" style="color: #1e3a5f;">cityping.net</a>
        </p>
      </div>
    `,
    text: `${monthName}, done.

${suspensionCount} day${suspensionCount !== 1 ? 's' : ''} you didn't have to move your car.
${highlights.length > 0 ? `\nHighlights: ${highlights.join(', ')}` : ''}
${nextMonthPreview ? `\nUp next: ${nextMonthPreview}` : ''}

---
Manage preferences: ${manageUrl}
`,
  }),
}

export default EMAIL_TEMPLATES
