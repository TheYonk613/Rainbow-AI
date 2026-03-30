import { Router } from 'express';
import { google } from 'googleapis';
import { db } from './db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
const RAINBOW_COLORS = ['g2-inferno', 'g7-solar', 'g5-toxic', 'g3-electric', 'g6-uv', 'g1-dusk', 'g4-laser', 'g8-chrome'];

// Deterministic color assignment based on event ID hash
function getColorForEvent(eventId: string) {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash << 5) - hash + eventId.charCodeAt(i);
    hash |= 0; 
  }
  const index = Math.abs(hash) % RAINBOW_COLORS.length;
  return RAINBOW_COLORS[index];
}

// Retrieve user's Google tokens from our DB
function getOAuthClientForUser(userId: string) {
  const credentials = db.prepare(`SELECT access_token, refresh_token FROM oauth_credentials WHERE user_id = ? AND provider = 'google'`).get(userId) as any;
  if (!credentials) return null; // Graceful skip for local-only development

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
  });
  return oauth2Client;
}

// 1. Google -> SQLite Bridge (Pull API)
router.post('/sync', async (req, res) => {
  // Temporary: Fetch the first authenticated user in the DB (since JWTs aren't active on frontend yet)
  let userId = '';
  try {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
    if (!user) return res.status(401).json({ error: 'No active user found in system' });
    userId = user.id;

    const auth = getOAuthClientForUser(userId);
    if (!auth) return res.json({ success: true, message: 'Offline Mode Active' });
    
    const calendar = google.calendar({ version: 'v3', auth: auth as any });

    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 7); // Start 7 days in the past to catch all recent/current day events
    
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30); // Sync a rolling 30-day window

    // Fetch primary calendar events
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    // Ensure this user has an active calendar tracking row in our DB
    const calendarRow = db.prepare('SELECT id FROM calendars WHERE user_id = ? LIMIT 1').get(userId) as any;
    let calendarId = calendarRow?.id;
    if (!calendarId) {
      calendarId = crypto.randomUUID();
      db.prepare(`INSERT INTO calendars (id, user_id, provider_calendar_id) VALUES (?, ?, 'primary')`)
        .run(calendarId, userId);
    }

    const insertEvent = db.prepare(`
      INSERT INTO events (id, calendar_id, provider_event_id, title, start_time, end_time, status, color)
      VALUES (@id, @calendarId, @providerId, @title, @startTime, @endTime, @status, @color)
      ON CONFLICT(id) DO UPDATE SET 
        title=excluded.title, 
        start_time=excluded.start_time, 
        end_time=excluded.end_time, 
        status=excluded.status,
        color=excluded.color
    `);

    // ACID Transaction for safe, high-speed bulk ingestion
    db.transaction(() => {
      for (const item of events) {
        if (!item.start?.dateTime || !item.end?.dateTime) continue; // Skip all-day events for exact DayWheel matching

        insertEvent.run({
          id: item.id, // We specifically use the Google Event ID as our primary key for exact mapping
          calendarId: calendarId,
          providerId: item.id,
          title: item.summary || 'Busy',
          startTime: item.start.dateTime,
          endTime: item.end.dateTime,
          status: item.status || 'confirmed',
          color: getColorForEvent(item.id!)
        });
      }
    })();

    res.json({ success: true, count: events.length });
  } catch (err: any) {
    console.error('Calendar Sync Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. SQLite -> React Pipeline (Push API)
router.get('/events', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
    if (!user) return res.json([]);

    const rows = db.prepare(`
      SELECT e.* FROM events e 
      JOIN calendars c ON e.calendar_id = c.id 
      WHERE c.user_id = ? AND e.status != 'cancelled'
    `).all(user.id) as any[];

    // Transform SQLite raw data into the strict `CalendarEvent` format DayWheel expects
    const formattedEvents = rows.map(r => {
      const sDate = new Date(r.start_time);
      const eDate = new Date(r.end_time);

      // Convert pure timestamps into accurate fractional hours (e.g., 14.5 = 2:30 PM)
      const startH = sDate.getHours() + sDate.getMinutes() / 60;
      const endH = eDate.getHours() + eDate.getMinutes() / 60;
      
      return {
        id: r.id,
        title: r.title,
        date: sDate.getFullYear() + '-' + String(sDate.getMonth() + 1).padStart(2, '0') + '-' + String(sDate.getDate()).padStart(2, '0'), // Reliable local YYYY-MM-DD
        startH,
        endH,
        color: r.color || RAINBOW_COLORS[0],
        notes: r.description || '',
        isImpassable: true
      };
    });

    res.json(formattedEvents);
  } catch (err: any) {
    console.error('Local Event Fetch Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2b. SQLite -> Journey View Pipeline
router.get('/journey', (req, res) => {
  const { date } = req.query; // Expected: YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'Date required' });

  try {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
    if (!user) return res.json({ completedTasks: [], beats: [] });

    const rows = db.prepare(`
      SELECT e.* FROM events e 
      JOIN calendars c ON e.calendar_id = c.id 
      WHERE c.user_id = ? AND (e.status = 'completed' OR e.status = 'cancelled') AND e.start_time LIKE ?
      ORDER BY e.end_time DESC
    `).all(user.id, `${date}%`) as any[];

    // Top chips row: only show what was actually finished
    const completedTasks = rows
      .filter(r => r.status === 'completed')
      .map(r => ({
        id: `comp_${r.id}`,
        label: r.title || 'Untitled Session'
      }));

    const beats = rows.map((r, index) => {
      const isDeleted = r.status === 'cancelled';
      const eDate = new Date(r.end_time || r.start_time);
      let hours = eDate.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const mins = eDate.getMinutes().toString().padStart(2, '0');

      return {
        id: `beat_${r.id}`,
        type: isDeleted ? 'deleted' : 'task',
        title: r.title || 'Untitled Session',
        summary: isDeleted 
          ? 'You removed this from your schedule today.' 
          : (index === 0 ? 'Freshly secured in your journey ledger.' : 'Completed and verified via database.'),
        time: `${hours}:${mins} ${ampm}`,
        pillColor: isDeleted ? 'red' : 'gold',
        pill: isDeleted ? 'Removed' : 'Checked off ✔',
      };
    });

    res.json({ completedTasks, beats });
  } catch (err: any) {
    console.error('Local Journey Fetch Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3a. Create Event (Local → SQLite → Google)
router.post('/events', async (req, res) => {
  const { id, title, date, startH, endH, color } = req.body;
  try {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const calendarRow = db.prepare('SELECT id FROM calendars WHERE user_id = ? LIMIT 1').get(user.id) as any;
    if (!calendarRow) return res.status(500).json({ error: 'No calendar found' });

    const startObj = new Date(date + 'T00:00:00');
    startObj.setMinutes(startH * 60);
    const endObj = new Date(date + 'T00:00:00');
    endObj.setMinutes(endH * 60);

    // Persist to local SQLite immediately
    db.prepare(`
      INSERT INTO events (id, calendar_id, provider_event_id, title, start_time, end_time, status, color)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title, start_time=excluded.start_time, end_time=excluded.end_time, color=excluded.color
    `).run(id, calendarRow.id, null, title, startObj.toISOString(), endObj.toISOString(), color || 'g2-inferno');

    // If Google is connected, push upstream
    const auth = getOAuthClientForUser(user.id);
    if (auth) {
      const calendar = google.calendar({ version: 'v3', auth: auth as any });
      const gcalEvent = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: title,
          start: { dateTime: startObj.toISOString() },
          end: { dateTime: endObj.toISOString() },
        }
      });
      // Update our local row with the Google-assigned provider_event_id for future sync
      if (gcalEvent.data.id) {
        db.prepare(`UPDATE events SET provider_event_id = ? WHERE id = ?`).run(gcalEvent.data.id, id);
      }
    }

    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Create Event Failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3b. Two-Way Sync Mutations (Write downstream changes back to upstream source)
router.put('/events/:id', async (req, res) => {
  const { id } = req.params;
  const { title, date, startH, endH, color, notes } = req.body;

  try {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Cleanly reconstruct standard ISO8601 formatting
    const startObj = new Date(date + 'T00:00:00');
    startObj.setMinutes(startH * 60);

    const endObj = new Date(date + 'T00:00:00');
    endObj.setMinutes(endH * 60);

    // Speed: Commit locally to SQLite instantly (color and description are optional updates)
    db.prepare(`UPDATE events SET start_time = ?, end_time = ?, title = COALESCE(?, title), color = COALESCE(?, color), description = COALESCE(?, description) WHERE id = ?`)
      .run(startObj.toISOString(), endObj.toISOString(), title, color, notes, id);

    const eventRow = db.prepare(`
      SELECT e.provider_event_id, c.provider_calendar_id
      FROM events e JOIN calendars c ON e.calendar_id = c.id
      WHERE e.id = ?
    `).get(id) as any;

    const auth = getOAuthClientForUser(user.id);
    if (auth && eventRow?.provider_event_id) {
        const calendar = google.calendar({ version: 'v3', auth: auth as any });

        // Build a patch body that only includes what changed
        const patchBody: any = {};
        if (title) patchBody.summary = title;
        if (notes !== undefined) patchBody.description = notes;
        patchBody.start = { dateTime: startObj.toISOString() };
        patchBody.end = { dateTime: endObj.toISOString() };

        // Consistency: Remote-patch Google Calendar natively
        await calendar.events.patch({
          calendarId: eventRow.provider_calendar_id,
          eventId: eventRow.provider_event_id,
          requestBody: patchBody
        });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('Put Mutation Failed:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const eventRow = db.prepare(`
      SELECT e.provider_event_id, c.provider_calendar_id
      FROM events e JOIN calendars c ON e.calendar_id = c.id
      WHERE e.id = ?
    `).get(id) as any;

    // Locally archive/soft-cancel
    db.prepare(`UPDATE events SET status = 'cancelled' WHERE id = ?`).run(id);

    const auth = getOAuthClientForUser(user.id);
    if (auth && eventRow?.provider_event_id) {
        const calendar = google.calendar({ version: 'v3', auth: auth as any });

        // Remote deletion execution
        await calendar.events.delete({
          calendarId: eventRow.provider_calendar_id,
          eventId: eventRow.provider_event_id
        });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete Mutation Failed:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/:id/complete', async (req, res) => {
  const { id } = req.params;
  try {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const eventRow = db.prepare(`
      SELECT e.provider_event_id, e.title, c.provider_calendar_id
      FROM events e JOIN calendars c ON e.calendar_id = c.id
      WHERE e.id = ?
    `).get(id) as any;
    if (!eventRow) return res.status(404).json({ error: 'Event not found' });

    // Locally mark as completed instead of cancelled
    db.prepare(`UPDATE events SET status = 'completed' WHERE id = ?`).run(id);

    const auth = getOAuthClientForUser(user.id);
    if (auth) {
        const calendar = google.calendar({ version: 'v3', auth: auth as any });

        // Remote indication: We rename it on Google Calendar with a checkmark so the user sees it is done!
        const updatedTitle = eventRow.title?.startsWith('✓') ? eventRow.title : `✓ ${eventRow.title}`;

        await calendar.events.patch({
          calendarId: eventRow.provider_calendar_id,
          eventId: eventRow.provider_event_id,
          requestBody: { summary: updatedTitle, colorId: '10' } // 10 is usually Basil/Green on Google
        });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('Completion Mutation Failed:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/:id/restore', async (req, res) => {
  const { id } = req.params;
  try {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const eventRow = db.prepare(`
      SELECT e.provider_event_id, e.title, c.provider_calendar_id
      FROM events e JOIN calendars c ON e.calendar_id = c.id
      WHERE e.id = ?
    `).get(id) as any;
    if (!eventRow) return res.status(404).json({ error: 'Event not found' });

    // Locally restore to active orbit
    db.prepare(`UPDATE events SET status = 'confirmed' WHERE id = ?`).run(id);

    const auth = getOAuthClientForUser(user.id);
    if (auth) {
        const calendar = google.calendar({ version: 'v3', auth: auth as any });

        // Remote indication: Remove the checkmark if present
        const cleanTitle = eventRow.title?.replace(/^✓\s*/, '');

        await calendar.events.patch({
          calendarId: eventRow.provider_calendar_id,
          eventId: eventRow.provider_event_id,
          requestBody: { 
            summary: cleanTitle, 
            colorId: null, // Reset to default color 
            status: 'confirmed'
          }
        });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('Restoration Mutation Failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
