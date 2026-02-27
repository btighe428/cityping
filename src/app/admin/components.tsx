'use client';

import { useState, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  TypeScript interfaces                                              */
/* ------------------------------------------------------------------ */

interface JobInfo {
  name: string;
  displayName: string;
  category: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastRun: string;
  lastStatus: string;
  expectedFrequency: string;
  missedRuns: number;
  consecutiveFailures: number;
  durationMs: number;
  itemsProcessed: number;
  itemsFailed: number;
}

interface EmailToday {
  sent: number;
  failed: number;
  pending: number;
  skipped: number;
}

interface EmailTypeStats {
  sent: number;
  failed: number;
  pending: number;
  skipped: number;
}

interface EmailInfo {
  today: EmailToday;
  byType: Record<string, EmailTypeStats>;
}

interface RecentFailure {
  jobName: string;
  errorMessage: string;
  startedAt: string;
  durationMs: number;
}

interface DashboardSummary {
  totalJobs: number;
  healthy: number;
  warning: number;
  critical: number;
  unknown: number;
}

interface DashboardData {
  status: 'healthy' | 'degraded' | 'critical';
  updatedAt: string;
  summary: DashboardSummary;
  jobs: JobInfo[];
  email: EmailInfo;
  recentFailures: RecentFailure[];
}

/* ------------------------------------------------------------------ */
/*  Helper functions                                                   */
/* ------------------------------------------------------------------ */

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 0) return 'just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatMs(ms: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ------------------------------------------------------------------ */
/*  Color / style helpers                                              */
/* ------------------------------------------------------------------ */

const STATUS_DOT: Record<string, string> = {
  healthy: '#22C55E',
  warning: '#EAB308',
  critical: '#EF4444',
  unknown: '#9CA3AF',
};

const BANNER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  healthy: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
  degraded: { bg: '#FEFCE8', border: '#FEF08A', text: '#854D0E' },
  critical: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
};

const CATEGORY_ORDER = ['scraper', 'email', 'processing', 'other'];

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1) + 's';
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBanner({ data }: { data: DashboardData }) {
  const style = BANNER_STYLES[data.status] ?? BANNER_STYLES.critical;
  const { summary } = data;
  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: style.text,
            textTransform: 'uppercase',
          }}
        >
          System {data.status}
        </span>
        <span style={{ marginLeft: 12, fontSize: 13, color: '#6B6B6B' }}>
          Updated {timeAgo(data.updatedAt)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#2C2C2C' }}>
        <span>
          <b style={{ color: '#22C55E' }}>{summary.healthy}</b> healthy
        </span>
        <span>
          <b style={{ color: '#EAB308' }}>{summary.warning}</b> warning
        </span>
        <span>
          <b style={{ color: '#EF4444' }}>{summary.critical}</b> critical
        </span>
        <span>
          <b style={{ color: '#9CA3AF' }}>{summary.unknown}</b> unknown
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E8E4DF',
        borderRadius: 12,
        padding: '16px 20px',
        flex: '1 1 200px',
      }}
    >
      <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 4, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#2C2C2C' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StatsRow({ data }: { data: DashboardData }) {
  const { email } = data;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}
    >
      <StatCard
        label="Emails Today"
        value={email.today.sent}
        sub={`${email.today.failed} failed / ${email.today.pending} pending`}
      />
      <StatCard
        label="Total Jobs"
        value={data.summary.totalJobs}
        sub={`${data.summary.healthy} healthy`}
      />
      <StatCard
        label="Failures (24h)"
        value={data.recentFailures.length}
        sub={data.recentFailures.length > 0 ? data.recentFailures[0].jobName : 'none'}
      />
    </div>
  );
}

function JobRow({ job }: { job: JobInfo }) {
  return (
    <tr style={{ borderBottom: '1px solid #E8E4DF' }}>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: STATUS_DOT[job.status] ?? STATUS_DOT.unknown,
            marginRight: 8,
            verticalAlign: 'middle',
          }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#2C2C2C' }}>
          {job.name}
        </span>
      </td>
      <td style={{ padding: '8px 12px', fontSize: 13, color: '#6B6B6B' }}>{job.displayName}</td>
      <td style={{ padding: '8px 12px', fontSize: 13, color: '#6B6B6B', whiteSpace: 'nowrap' }}>
        {job.lastRun ? timeAgo(job.lastRun) : '-'}
      </td>
      <td style={{ padding: '8px 12px', fontSize: 13, color: '#6B6B6B', whiteSpace: 'nowrap' }}>
        {formatMs(job.durationMs)}
      </td>
      <td style={{ padding: '8px 12px', fontSize: 13, color: '#6B6B6B', textAlign: 'right' }}>
        {job.itemsProcessed}
        {job.itemsFailed > 0 && (
          <span style={{ color: '#EF4444', marginLeft: 4 }}>({job.itemsFailed} failed)</span>
        )}
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
        {job.missedRuns > 0 && (
          <span
            style={{
              background: '#FEF2F2',
              color: '#EF4444',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            {job.missedRuns} missed
          </span>
        )}
      </td>
    </tr>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: '#6B6B6B',
  textTransform: 'uppercase',
  textAlign: 'left',
  letterSpacing: 0.5,
};

function JobPipelineGrid({ jobs }: { jobs: JobInfo[] }) {
  const statusPriority: Record<string, number> = { critical: 0, warning: 1, unknown: 2, healthy: 3 };

  const grouped: Record<string, JobInfo[]> = {};
  for (const job of jobs) {
    const cat = CATEGORY_ORDER.includes(job.category) ? job.category : 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(job);
  }

  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort(
      (a, b) => (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9),
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C2C2C' }}>Job Pipeline</h2>
      {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
        <div key={cat}>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 13,
              fontWeight: 600,
              color: '#6B6B6B',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {categoryLabel(cat)}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#fff',
                border: '1px solid #E8E4DF',
                borderRadius: 8,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E4DF' }}>
                  <th style={thStyle}>Job</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Last Run</th>
                  <th style={thStyle}>Duration</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Items</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Missed</th>
                </tr>
              </thead>
              <tbody>
                {grouped[cat].map((job) => (
                  <JobRow key={job.name} job={job} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailBreakdown({ email }: { email: EmailInfo }) {
  const types = Object.entries(email.byType);
  if (types.length === 0) return null;

  return (
    <div>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#2C2C2C' }}>
        Email Breakdown
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {types.map(([type, stats]) => (
          <div
            key={type}
            style={{
              background: '#fff',
              border: '1px solid #E8E4DF',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#2C2C2C',
                marginBottom: 6,
                textTransform: 'capitalize',
              }}
            >
              {type.replace(/[_-]/g, ' ')}
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6B6B6B' }}>
              <span>
                <b style={{ color: '#22C55E' }}>{stats.sent}</b> sent
              </span>
              <span>
                <b style={{ color: '#EF4444' }}>{stats.failed}</b> fail
              </span>
              <span>
                <b style={{ color: '#EAB308' }}>{stats.pending}</b> pend
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentFailures({ failures }: { failures: RecentFailure[] }) {
  if (failures.length === 0) return null;

  return (
    <div>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#2C2C2C' }}>
        Recent Failures
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {failures.map((f, i) => (
          <div
            key={`${f.jobName}-${i}`}
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#991B1B',
                }}
              >
                {f.jobName}
              </span>
              <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                {f.startedAt ? timeAgo(f.startedAt) : '-'} &middot; {formatMs(f.durationMs)}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#EF4444', fontFamily: 'monospace' }}>
              {f.errorMessage}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Calendar tab types & helpers                                       */
/* ------------------------------------------------------------------ */

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  category: string;
  source: 'city_event' | 'parks' | 'dining' | '311';
  venue?: string;
  borough?: string;
  url?: string;
}

interface CalendarData {
  month: string;
  events: CalendarEvent[];
  counts: Record<string, number>;
}

const CATEGORY_COLORS: Record<string, string> = {
  culture: '#8B5CF6',
  food: '#F59E0B',
  civic: '#3B82F6',
  sports: '#22C55E',
  transit: '#6366F1',
  seasonal: '#EC4899',
  parks: '#10B981',
  dining: '#F97316',
  weather: '#64748B',
  local: '#78716C',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthString(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/* ------------------------------------------------------------------ */
/*  Calendar Tab component                                             */
/* ------------------------------------------------------------------ */

function CalendarTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [calData, setCalData] = useState<CalendarData | null>(null);
  const [calError, setCalError] = useState<string | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    setCalError(null);
    try {
      const res = await fetch(`/api/admin/calendar?month=${getMonthString(y, m)}`);
      if (!res.ok) {
        setCalError(`Calendar API returned ${res.status}`);
        return;
      }
      const json: CalendarData = await res.json();
      setCalData(json);
      // Initialize all categories as active
      const cats = new Set(json.events.map((e) => e.category));
      setActiveCategories(cats);
    } catch (err) {
      setCalError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setCalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(year, month);
  }, [year, month, fetchCalendar]);

  const goToPrevMonth = () => {
    setSelectedDay(null);
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const goToNextMonth = () => {
    setSelectedDay(null);
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Build events-by-day map
  const eventsByDay: Record<number, CalendarEvent[]> = {};
  if (calData) {
    for (const evt of calData.events) {
      if (!activeCategories.has(evt.category)) continue;
      const d = parseInt(evt.date.split('-')[2], 10);
      const evtMonth = parseInt(evt.date.split('-')[1], 10) - 1;
      const evtYear = parseInt(evt.date.split('-')[0], 10);
      if (evtYear === year && evtMonth === month) {
        if (!eventsByDay[d]) eventsByDay[d] = [];
        eventsByDay[d].push(evt);
      }
      // For multi-day events, add dots to each day in range
      if (evt.endDate) {
        const endParts = evt.endDate.split('-');
        const endYear = parseInt(endParts[0], 10);
        const endMonth = parseInt(endParts[1], 10) - 1;
        const endDay = parseInt(endParts[2], 10);
        const startDay = evtYear === year && evtMonth === month ? d + 1 : 1;
        const lastDay = endYear === year && endMonth === month
          ? endDay
          : getDaysInMonth(year, month);
        if (endYear > year || (endYear === year && endMonth >= month)) {
          for (let i = startDay; i <= lastDay; i++) {
            if (!eventsByDay[i]) eventsByDay[i] = [];
            eventsByDay[i].push(evt);
          }
        }
      }
    }
  }

  // Filtered event list
  const filteredEvents = calData
    ? calData.events.filter((e) => {
        if (!activeCategories.has(e.category)) return false;
        if (selectedDay !== null) {
          const d = parseInt(e.date.split('-')[2], 10);
          const m = parseInt(e.date.split('-')[1], 10) - 1;
          const y = parseInt(e.date.split('-')[0], 10);
          if (y !== year || m !== month || d !== selectedDay) return false;
        }
        return true;
      })
    : [];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // All categories present in data
  const allCategories = calData
    ? [...new Set(calData.events.map((e) => e.category))].sort()
    : [];

  const totalEvents = calData ? calData.events.length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {calError && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#991B1B',
            fontSize: 14,
          }}
        >
          {calError}
        </div>
      )}

      {/* Month navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={goToPrevMonth}
          style={{
            padding: '6px 14px',
            border: '1px solid #E8E4DF',
            borderRadius: 6,
            background: '#fff',
            fontSize: 16,
            cursor: 'pointer',
            color: '#2C2C2C',
          }}
        >
          &lt;
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2C2C2C' }}>
            {MONTH_NAMES[month]} {year}
          </h2>
          <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>
            {calLoading ? 'Loading...' : `${totalEvents} events`}
          </div>
        </div>
        <button
          onClick={goToNextMonth}
          style={{
            padding: '6px 14px',
            border: '1px solid #E8E4DF',
            borderRadius: 6,
            background: '#fff',
            fontSize: 16,
            cursor: 'pointer',
            color: '#2C2C2C',
          }}
        >
          &gt;
        </button>
      </div>

      {/* Category filter chips */}
      {allCategories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allCategories.map((cat) => {
            const isActive = activeCategories.has(cat);
            const color = CATEGORY_COLORS[cat] ?? '#6B6B6B';
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  border: `1px solid ${color}`,
                  background: isActive ? color : '#fff',
                  color: isActive ? '#fff' : color,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                {cat} {calData?.counts[cat] ? `(${calData.counts[cat]})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Month grid */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E8E4DF',
          borderRadius: 12,
          padding: 12,
          overflowX: 'auto',
        }}
      >
        {/* Day-of-week headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
            marginBottom: 4,
          }}
        >
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: '#6B6B6B',
                textTransform: 'uppercase',
                padding: '4px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
          }}
        >
          {/* Empty cells for offset */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: 64 }} />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = eventsByDay[day] ?? [];
            const isSelected = selectedDay === day;
            const isToday =
              day === now.getDate() &&
              month === now.getMonth() &&
              year === now.getFullYear();

            // Unique categories for dot display
            const dotCats = [...new Set(dayEvents.map((e) => e.category))].slice(0, 5);

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                style={{
                  minHeight: 64,
                  padding: 4,
                  borderRadius: 6,
                  border: isSelected
                    ? '2px solid #8B6F47'
                    : isToday
                      ? '2px solid #E8E4DF'
                      : '1px solid transparent',
                  background: isSelected ? '#FAF3EB' : isToday ? '#FDFCFA' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? '#8B6F47' : '#2C2C2C',
                    marginBottom: 2,
                  }}
                >
                  {day}
                </div>
                {dayEvents.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {dotCats.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: CATEGORY_COLORS[cat] ?? '#6B6B6B',
                          display: 'inline-block',
                        }}
                      />
                    ))}
                    {dayEvents.length > 5 && (
                      <span style={{ fontSize: 9, color: '#6B6B6B', lineHeight: '7px' }}>
                        +{dayEvents.length - 5}
                      </span>
                    )}
                  </div>
                )}
                {dayEvents.length > 0 && (
                  <div style={{ fontSize: 9, color: '#6B6B6B', marginTop: 2 }}>
                    {dayEvents.length}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event list */}
      <div>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#2C2C2C' }}>
          {selectedDay !== null
            ? `Events on ${MONTH_NAMES[month]} ${selectedDay}`
            : 'All Events'}
          <span style={{ fontWeight: 400, fontSize: 13, color: '#6B6B6B', marginLeft: 8 }}>
            ({filteredEvents.length})
          </span>
        </h2>
        {filteredEvents.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #E8E4DF',
              borderRadius: 8,
              padding: '24px 16px',
              textAlign: 'center',
              color: '#6B6B6B',
              fontSize: 14,
            }}
          >
            {calLoading ? 'Loading events...' : 'No events found'}
          </div>
        ) : (
          <div
            style={{
              overflowX: 'auto',
              background: '#fff',
              border: '1px solid #E8E4DF',
              borderRadius: 8,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E4DF' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Venue</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Borough</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice(0, 100).map((evt) => (
                  <tr key={evt.id} style={{ borderBottom: '1px solid #E8E4DF' }}>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#6B6B6B', whiteSpace: 'nowrap' }}>
                      {evt.date}
                      {evt.endDate && evt.endDate !== evt.date && (
                        <span style={{ color: '#9CA3AF' }}> - {evt.endDate}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#fff',
                          background: CATEGORY_COLORS[evt.category] ?? '#6B6B6B',
                          textTransform: 'capitalize',
                        }}
                      >
                        {evt.category}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#2C2C2C', maxWidth: 300 }}>
                      {evt.url ? (
                        <a
                          href={evt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#8B6F47', textDecoration: 'none' }}
                        >
                          {evt.title}
                        </a>
                      ) : (
                        evt.title
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#6B6B6B' }}>
                      {evt.venue ?? '-'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#6B6B6B' }}>
                      {evt.source}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#6B6B6B' }}>
                      {evt.borough ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEvents.length > 100 && (
              <div style={{ padding: '8px 12px', fontSize: 12, color: '#6B6B6B', textAlign: 'center' }}>
                Showing 100 of {filteredEvents.length} events
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab bar                                                            */
/* ------------------------------------------------------------------ */

type TabId = 'ops' | 'calendar';

function TabBar({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'ops', label: 'Ops' },
    { id: 'calendar', label: 'Calendar' },
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        background: '#E8E4DF',
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: 'none',
            background: active === tab.id ? '#fff' : 'transparent',
            color: active === tab.id ? '#2C2C2C' : '#6B6B6B',
            fontSize: 13,
            fontWeight: active === tab.id ? 600 : 400,
            cursor: 'pointer',
            boxShadow: active === tab.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main dashboard component                                           */
/* ------------------------------------------------------------------ */

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('ops');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) {
        setError(`Dashboard API returned ${res.status}`);
        return;
      }
      const json: DashboardData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and every 30 seconds (ops tab data)
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', color: '#2C2C2C' }}>
      {/* Header */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '24px 20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>CityPing Admin</h1>
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {loading && activeTab === 'ops' && (
            <span style={{ fontSize: 12, color: '#6B6B6B' }}>refreshing...</span>
          )}
          {activeTab === 'ops' && (
            <button
              onClick={fetchDashboard}
              style={{
                padding: '6px 12px',
                border: '1px solid #E8E4DF',
                borderRadius: 6,
                background: '#fff',
                fontSize: 13,
                cursor: 'pointer',
                color: '#2C2C2C',
              }}
            >
              Refresh
            </button>
          )}
          <a
            href="/"
            style={{
              padding: '6px 12px',
              border: '1px solid #E8E4DF',
              borderRadius: 6,
              background: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              color: '#6B6B6B',
              textDecoration: 'none',
            }}
          >
            Home
          </a>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '16px 20px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {activeTab === 'ops' && (
          <>
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  padding: '12px 16px',
                  color: '#991B1B',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            {data && (
              <>
                <StatusBanner data={data} />
                <StatsRow data={data} />
                <JobPipelineGrid jobs={data.jobs} />
                <EmailBreakdown email={data.email} />
                <RecentFailures failures={data.recentFailures} />
              </>
            )}

            {!data && !error && (
              <div style={{ textAlign: 'center', padding: 48, color: '#6B6B6B', fontSize: 14 }}>
                Loading dashboard...
              </div>
            )}
          </>
        )}

        {activeTab === 'calendar' && <CalendarTab />}
      </div>
    </div>
  );
}
