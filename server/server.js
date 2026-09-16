const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJh...';
const supabase = createClient(supabaseUrl, supabaseKey);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
});

// Student Profile
app.get('/api/student', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
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
        diningDollars: 145.50,
      });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dining Venues
app.get('/api/dining/venues', async (req, res) => {
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

// Clubs
app.get('/api/clubs', async (req, res) => {
  const { category, search } = req.query;
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

// Safety Contacts
app.get('/api/safety/contacts', (req, res) => {
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
