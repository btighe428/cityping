// Email Templates for CityPing
// Professional, clear, actionable — respect the reader's time
// Design principles: Clarity > cleverness, context > content

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
  // Holiday-specific greetings - single emoji, professional
  const lower = holidayName.toLowerCase()

  if (lower.includes('christmas')) return 'Happy holidays'
  if (lower.includes('new year') && lower.includes('eve')) return 'New Year\'s Eve'
  if (lower.includes('new year')) return 'Happy New Year'
  if (lower.includes('thanksgiving')) return 'Happy Thanksgiving'
  if (lower.includes('lunar new year')) return 'Lunar New Year'
  if (lower.includes('independence') || lower.includes('july 4')) return 'Independence Day'
  if (lower.includes('passover')) return 'Passover'
  if (lower.includes('easter') || lower.includes('good friday') || lower.includes('holy thursday')) return 'Easter weekend'
  if (lower.includes('eid') || lower.includes('idul')) return 'Eid Mubarak'
  if (lower.includes('diwali')) return 'Happy Diwali'

  // Consecutive days messaging - clear, not celebratory
  if (consecutiveDays && consecutiveDays >= 4) return `${consecutiveDays}-day suspension period`
  if (consecutiveDays && consecutiveDays >= 2) return `${consecutiveDays} consecutive days`

  return 'ASP suspended'
}

function getActionLine(consecutiveDays?: number): { html: string; text: string } {
  if (consecutiveDays && consecutiveDays >= 4) {
    return {
      html: `ASP is suspended for <strong>${consecutiveDays} consecutive days</strong>. No need to move your car.`,
      text: `ASP is suspended for ${consecutiveDays} consecutive days. No need to move your car.`
    }
  }
  if (consecutiveDays && consecutiveDays >= 2) {
    return {
      html: `ASP is suspended for <strong>${consecutiveDays} days</strong>. Your car can stay parked.`,
      text: `ASP is suspended for ${consecutiveDays} days. Your car can stay parked.`
    }
  }

  // Default - clear, actionable
  return {
    html: 'No need to move your car. ASP is suspended.',
    text: 'No need to move your car. ASP is suspended.'
  }
}

function getWeeklyIntro(count: number): string {
  if (count >= 5) return `${count} ASP suspension days this week:`
  if (count >= 3) return `${count} days this week with ASP suspended:`
  if (count === 2) return `2 ASP suspension days this week:`
  return `1 ASP suspension day this week:`
}

function getMonthlyIntro(count: number, monthName: string): string {
  if (count >= 8) return `${count} ASP suspension days in ${monthName}.`
  if (count >= 5) return `${count} ASP suspension days this month.`
  if (count >= 3) return `${count} suspension days in ${monthName}.`
  if (count === 2) return `2 suspension days in ${monthName}.`
  if (count === 1) return `1 suspension day in ${monthName}.`
  return `No suspensions scheduled for ${monthName}.`
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
    subject: 'CityPing: Your ASP alerts are active',
    html: `
      <div style="${baseStyle}">
        <h1 style="color: #1e3a5f; margin-bottom: 24px; font-weight: 600;">
          Your parking alerts are ready
        </h1>

        <p style="font-size: 17px; line-height: 1.6; margin-bottom: 24px; color: #334155;">
          We'll notify you the evening before every ASP suspension. One email or text—clear, timely, and actionable.
        </p>

        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 3px solid #1e3a5f;">
          <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #475569;">
            <strong>What to expect:</strong><br/>
            • Alerts sent by 8 PM the night before<br/>
            • Only when ASP is suspended<br/>
            • Includes reason and any meter changes
          </p>
        </div>

        <p style="margin: 32px 0;">
          <a href="${manageUrl}" style="${buttonStyle}">Review Settings</a>
        </p>

        <p style="font-size: 14px; color: #64748b;">
          Questions? Reply to this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="font-size: 12px; color: #94a3b8;">
          CityPing · NYC Alternate Side Parking Alerts
        </p>
      </div>
    `,
    text: `Your parking alerts are ready

We'll notify you the evening before every ASP suspension. One email or text—clear, timely, and actionable.

What to expect:
• Alerts sent by 8 PM the night before
• Only when ASP is suspended
• Includes reason and any meter changes

Review settings: ${manageUrl}

Questions? Reply to this email.

---
CityPing · NYC Alternate Side Parking Alerts`,
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
        ? `CityPing: ${suspensions.length} ASP suspension day${suspensions.length !== 1 ? 's' : ''} this week`
        : 'CityPing: Your week ahead',
      html: `
        <div style="${baseStyle}">
          <!-- Welcome Section -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; color: white;">
            <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 600;">
              Your alerts are active
            </h1>
            <p style="margin: 0; font-size: 17px; opacity: 0.9;">
              Clear, timely ASP notifications for NYC
            </p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 3px solid #1e3a5f;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #475569;">
              <strong>What to expect:</strong><br/>
              • Alerts sent by 8 PM the night before each suspension<br/>
              • Includes reason and any meter/school changes<br/>
              • No spam—only when ASP is suspended
            </p>
          </div>

          <!-- Week Ahead Section -->
          <div style="background: #eff6ff; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1e40af; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">
              Week Ahead
            </h2>
            <p style="font-size: 14px; margin: 0; color: #1e40af;">
              ${weekRange}
            </p>
          </div>

          ${hasSuspensions ? `
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #334155;">
              ${intro}
            </p>

            ${suspensions.map((s, i) => `
              <div style="background: ${i % 2 === 0 ? '#f0fdf4' : '#ffffff'}; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-weight: 600; color: #166534; font-size: 15px;">${s.dayOfWeek}, ${s.date}</span>
                </div>
                <div style="font-size: 14px; color: #1e3a5f; margin-bottom: 8px;">
                  <strong>${s.summary}</strong>
                </div>
                <div style="font-size: 13px; color: #64748b; display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
                  <span>ASP: <strong style="color: #166534;">Suspended</strong></span>
                  <span>Meters: <strong style="color: ${s.meters === 'Suspended' ? '#166534' : '#dc2626'};">${s.meters || 'In Effect'}</strong></span>
                  <span>Trash: <strong style="color: ${s.trash === 'Suspended' ? '#166534' : '#64748b'};">${s.trash || 'Normal'}</strong></span>
                  <span>Schools: <strong style="color: ${s.schools === 'Closed' ? '#166534' : '#64748b'};">${s.schools || 'Open'}</strong></span>
                </div>
              </div>
            `).join('')}
          ` : `
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0; color: #64748b; font-size: 15px;">
                Regular week ahead — ASP and trash collection on normal schedule.
              </p>
            </div>
          `}

          ${subwayAlertsHtml || ''}

          <p style="font-size: 14px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 24px;">
            We will remind you the evening before each suspension.
          </p>

          <p style="margin: 32px 0;">
            <a href="${manageUrl}" style="${buttonStyle}">Manage Alerts</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

          <p style="font-size: 14px; color: #64748b; text-align: center;">
            Questions? Reply to this email.<br />
            <a href="${manageUrl}" style="color: #1e3a5f;">Manage preferences</a> ·
            <a href="https://cityping.net" style="color: #1e3a5f;">cityping.net</a>
          </p>
        </div>
      `,
      text: `CityPing: Your alerts are active

Clear, timely ASP notifications for NYC.

What to expect:
• Alerts sent by 8 PM the night before each suspension
• Includes reason and any meter/school changes
• No spam—only when ASP is suspended

---

WEEK AHEAD: ${weekRange}

${hasSuspensions ? `${intro}

${suspensions.map(s => `• ${s.dayOfWeek}, ${s.date} — ${s.summary}
  ASP: Suspended | Meters: ${s.meters || 'In Effect'} | Trash: ${s.trash || 'Normal'} | Schools: ${s.schools || 'Open'}`).join('\n\n')}` : 'Regular week ahead — ASP and trash collection on normal schedule.'}

${subwayAlertsText || ''}
We will remind you the evening before each suspension.

---
Manage alerts: ${manageUrl}
Questions? Reply to this email.
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
      subject: `ASP Suspended: ${holidayName} (${date})`,
      html: `
        <div style="${baseStyle}">
          <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #166534;">
            <h1 style="color: #166534; margin: 0 0 8px 0; font-size: 22px; font-weight: 600;">
              ${goodNews}
            </h1>
            <p style="font-size: 16px; margin: 0; color: #166534;">
              Alternate side parking is suspended tomorrow.
            </p>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px 0; color: #1e3a5f;">
              <strong>Date:</strong> ${date}
            </p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #1e3a5f;">
              <strong>Reason:</strong> ${holidayName}
            </p>
          </div>

          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 3px solid #d97706;">
            <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #92400e;">
              ${actionLine.html}
            </p>
          </div>

          ${tipsHtml || ''}

          ${upcomingDays && upcomingDays.length > 0 ? `
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; color: #1e3a5f; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Coming Up
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
            <a href="${manageUrl}" style="color: #1e3a5f; text-decoration: underline;">Manage preferences</a> ·
            <a href="https://cityping.net" style="color: #1e3a5f; text-decoration: underline;">cityping.net</a>
          </p>
        </div>
      `,
      text: `${goodNews}. Alternate side parking is suspended tomorrow.

Date: ${date}
Reason: ${holidayName}

${actionLine.text}${tipsText || ''}
${upcomingDays && upcomingDays.length > 0 ? `
COMING UP
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
      subject: `Week ahead: ${suspensions.length} ASP suspension day${suspensions.length !== 1 ? 's' : ''}`,
      html: `
        <div style="${baseStyle}">
          <div style="background: #eff6ff; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="color: #1e40af; margin: 0 0 8px 0; font-size: 22px; font-weight: 600;">
              Week Ahead
            </h1>
            <p style="font-size: 15px; margin: 0; color: #1e40af;">
              ${weekRange}
            </p>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #334155;">
            ${intro}
          </p>

          ${suspensions.map((s, i) => `
            <div style="background: ${i % 2 === 0 ? '#f0fdf4' : '#ffffff'}; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #166534; font-size: 15px;">${s.dayOfWeek}, ${s.date}</span>
              </div>
              <div style="font-size: 14px; color: #1e3a5f; margin-bottom: 8px;">
                <strong>${s.summary}</strong>
              </div>
              <div style="font-size: 13px; color: #64748b; display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
                <span>ASP: <strong style="color: #166534;">Suspended</strong></span>
                <span>Meters: <strong style="color: ${s.meters === 'Suspended' ? '#166534' : '#dc2626'};">${s.meters || 'In Effect'}</strong></span>
                <span>Trash: <strong style="color: ${s.trash === 'Suspended' ? '#166534' : '#64748b'};">${s.trash || 'Normal'}</strong></span>
                <span>Schools: <strong style="color: ${s.schools === 'Closed' ? '#166534' : '#64748b'};">${s.schools || 'Open'}</strong></span>
              </div>
            </div>
          `).join('')}

          <p style="font-size: 14px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 24px;">
            We will remind you the evening before each suspension.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

          <p style="font-size: 14px; color: #64748b;">
            <a href="${manageUrl}" style="color: #1e3a5f; text-decoration: underline;">Manage preferences</a> ·
            <a href="https://cityping.net" style="color: #1e3a5f; text-decoration: underline;">cityping.net</a>
          </p>
        </div>
      `,
      text: `Week ahead: ${weekRange}

${intro}

${suspensions.map(s => `• ${s.dayOfWeek}, ${s.date} — ${s.summary}
  ASP: Suspended | Meters: ${s.meters || 'In Effect'} | Trash: ${s.trash || 'Normal'} | Schools: ${s.schools || 'Open'}`).join('\n\n')}

We will remind you the evening before each suspension.

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
    subject: `${monthName}: ${suspensionCount} ASP suspension day${suspensionCount !== 1 ? 's' : ''}`,
    html: `
      <div style="${baseStyle}">
        <h1 style="color: #1e3a5f; margin-bottom: 24px; font-weight: 600;">
          ${monthName} Summary
        </h1>

        <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <p style="font-size: 48px; margin: 0; color: #166534; font-weight: 600;">
            ${suspensionCount}
          </p>
          <p style="font-size: 15px; margin: 8px 0 0 0; color: #15803d;">
            ASP suspension day${suspensionCount !== 1 ? 's' : ''}
          </p>
        </div>

        ${highlights.length > 0 ? `
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            <strong>Notable:</strong> ${highlights.join(', ')}
          </p>
        ` : ''}

        ${nextMonthPreview ? `
          <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #334155;">
              <strong>Next month:</strong> ${nextMonthPreview}
            </p>
          </div>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="font-size: 14px; color: #64748b;">
          <a href="${manageUrl}" style="color: #1e3a5f; text-decoration: underline;">Manage preferences</a> ·
          <a href="https://cityping.net" style="color: #1e3a5f; text-decoration: underline;">cityping.net</a>
        </p>
      </div>
    `,
    text: `${monthName} Summary

${suspensionCount} ASP suspension day${suspensionCount !== 1 ? 's' : ''}.
${highlights.length > 0 ? `\nNotable: ${highlights.join(', ')}` : ''}
${nextMonthPreview ? `\nNext month: ${nextMonthPreview}` : ''}

---
Manage preferences: ${manageUrl}
`,
  }),
}

export default EMAIL_TEMPLATES
