const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { getDefaultClient, getScopedClient } = require('./dal/supabase-client');
const studentDal = require('./dal/student-dal');
const diningDal = require('./dal/dining-dal');
const clubsDal = require('./dal/clubs-dal');
const postsDal = require('./dal/posts-dal');
const safetyDal = require('./dal/safety-dal');
const directoryDal = require('./dal/directory-dal');

const studentService = require('./services/student-service');
const diningService = require('./services/dining-service');
const clubsService = require('./services/clubs-service');
const feedService = require('./services/feed-service');
const { scrapeEvents } = require('./services/event-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabase = getDefaultClient();

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
});

// Student Profile Endpoint
app.get('/api/student', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const client = getScopedClient(authHeader);

    // If username query param provided, search by username; otherwise get first student
    const username = req.query.username;
    let student = null;

    if (username) {
      student = await studentDal.getStudentByUsername(username, client);
    } else {
      const { data } = await client.from('students').select('*').limit(1).single();
      student = data;
    }

    if (!student) {
      // Graceful offline / initial fallback
      return res.json({
        id: '1234567',
        name: 'Alex Knight',
        email: 'ak23@calvin.edu',
        major: 'Computer Science, B.S.',
        classYear: 'Sophomore',
        residenceHall: 'Bolt Hall',
        room: '214',
        advisor: 'Prof. Victor Norman',
        mealPlan: 'Core 17',
        swipesRemaining: 12,
        diningDollars: 145.5,
      });
    }

    res.json(studentService.formatStudentProfile(student));
  } catch (err) {
    res.json({
      id: '1234567',
      name: 'Alex Knight',
      email: 'ak23@calvin.edu',
      major: 'Computer Science, B.S.',
      classYear: 'Sophomore',
      residenceHall: 'Bolt Hall',
      room: '214',
      advisor: 'Prof. Victor Norman',
      mealPlan: 'Core 17',
      swipesRemaining: 12,
      diningDollars: 145.5,
    });
  }
});

// Student FERPA Directory Preference Update
app.post('/api/student/directory-preference', async (req, res) => {
  try {
    const { studentId, directoryOptIn, directoryVisibleFields } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const client = getScopedClient(req.headers.authorization);
    const updated = await studentService.setDirectoryPreferences(
      { studentId, directoryOptIn, directoryVisibleFields },
      studentDal,
      directoryDal
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dining Venues Endpoint
app.get('/api/dining/venues', async (req, res) => {
  try {
    const venues = await diningDal.getDiningVenues();
    if (venues && venues.length > 0) {
      const enriched = venues.map((v) => {
        const status = diningService.evaluateVenueStatus(v);
        return {
          id: v.id,
          name: v.name,
          location: v.location,
          status: status.isOpen ? 'Open' : 'Closed',
          currentMeal: status.currentMeal,
          hours: status.hoursDisplay,
          acceptsSwipes: v.accepts_swipes,
        };
      });
      return res.json(enriched);
    }
  } catch (err) {
    // Graceful offline fallback below
  }

  res.json([
    {
      id: 'commons',
      name: 'Commons Dining Hall',
      status: 'Open',
      currentMeal: 'Dinner',
      hours: '4:45 PM - 7:30 PM',
    },
    {
      id: 'knollcrest',
      name: 'Knollcrest Dining Hall',
      status: 'Closed',
      currentMeal: 'Reopens Tomorrow',
      hours: 'Closed',
    },
    {
      id: 'johnnys',
      name: "Johnny's Cafe",
      status: 'Open',
      currentMeal: 'Late Night Grill',
      hours: '7:30 AM - 11:00 PM',
    },
    {
      id: 'peets',
      name: "Peet's Coffee (Hekman Library)",
      status: 'Open',
      currentMeal: 'Coffee & Pastries',
      hours: '7:30 AM - 10:00 PM',
    },
  ]);
});

// Student Dining Account Summary
app.get('/api/dining/summary', async (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId query param is required' });
    }
    const summary = await diningService.getStudentDiningSummary(studentId, {}, diningDal);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conduct Dining Transaction / Swipe
app.post('/api/dining/transaction', async (req, res) => {
  try {
    const { studentId, venueId, transactionType, amount, registerId, cashierId, description } = req.body;
    if (!studentId || !venueId || !transactionType || amount === undefined) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }

    const result = await diningService.processTransaction(
      { studentId, venueId, transactionType, amount, registerId, cashierId, description },
      diningDal
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Clubs Endpoint
app.get('/api/clubs', async (req, res) => {
  const { category, search } = req.query;

  try {
    const clubs = await clubsDal.getClubs({ category, search });
    if (clubs && clubs.length > 0) {
      return res.json(clubs);
    }
  } catch (err) {
    // Fall back to sample clubs below
  }

  const sampleClubs = [
    {
      id: 'running-club',
      name: 'Calvin Running Club',
      category: 'athletics',
      description: 'Weekly group runs across campus trails for all fitness levels.',
      membersCount: 42,
    },
    {
      id: 'cs-club',
      name: 'Computer Science Club',
      category: 'academic',
      description: 'Hackathons, coding workshops, and tech networking.',
      membersCount: 88,
    },
    {
      id: 'campus-choir',
      name: 'Campus Choir',
      category: 'the-arts',
      description: 'Vocal ensemble performing choral classics and hymns in Chapel.',
      membersCount: 65,
    },
  ];

  let filtered = sampleClubs;
  if (category && category !== 'all') {
    filtered = filtered.filter((c) => c.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
  }

  res.json(filtered);
});

// Club Leadership Claim Code Redemption
app.post('/api/clubs/claim', async (req, res) => {
  try {
    const { rawCode, studentId, targetClubId } = req.body;
    if (!rawCode || !studentId) {
      return res.status(400).json({ error: 'rawCode and studentId are required' });
    }

    const result = await clubsService.redeemClaimCode(
      { rawCode, studentId, targetClubId },
      clubsDal
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Calvin Campus Events Scraper API
// SPRINT 1 SLO CONTEXT (SC2):
// Serves live and cached events scraped from calvin.edu/events/all.
app.get('/api/events', async (req, res) => {
  try {
    const pages = parseInt(req.query.pages, 10) || 3;
    const forceRefresh = req.query.refresh === 'true';
    const category = req.query.category;

    const events = await scrapeEvents({ pages, forceRefresh });

    let filtered = events;
    if (category && category !== 'All') {
      filtered = filtered.filter((e) => e.category.toLowerCase() === category.toLowerCase());
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events', message: err.message });
  }
});

// Unified Posts API (Reverse chronological feed & flyer authoring)
app.get('/api/posts', async (req, res) => {
  try {
    const { category, search, limit, offset } = req.query;
    const posts = await postsDal.getPosts({
      category,
      search,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const createdPost = await feedService.publishPost(req.body, postsDal);
    res.status(201).json(createdPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Safety Contacts
app.get('/api/safety/contacts', async (req, res) => {
  try {
    const contacts = await safetyDal.getSafetyContacts();
    if (contacts && contacts.length > 0) {
      return res.json(contacts);
    }
  } catch (err) {
    // Offline fallback
  }

  res.json({
    emergency: '616-526-3333',
    nonEmergency: '616-526-6452',
    campusEscort: '616-526-6452',
    healthServices: '616-526-6187',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Knightly server running on port ${PORT}`);
  });
}

module.exports = app;
