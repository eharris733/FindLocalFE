const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mrhqhjtxlrmpqcnprrws.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yaHFoanR4bHJtcHFjbnBycndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyNTUwMDMsImV4cCI6MjA0NzgzMTAwM30.m0pGxdMQSLjAhPYf6QJ72lsaJ9HOb_cJ44p2WE8lIHM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugVenueSizes() {
  try {
    console.log('Fetching venue sizes from database...');
    const { data: venues, error } = await supabase
      .from('venues')
      .select('name, venue_size, type')
      .limit(20);

    if (error) {
      console.error('Error fetching venues:', error);
      return;
    }

    console.log('\nVenue sizes found:');
    const sizeSet = new Set();
    venues.forEach(venue => {
      if (venue.venue_size) {
        sizeSet.add(venue.venue_size);
        console.log(`${venue.name}: ${venue.venue_size} (type: ${venue.type})`);
      }
    });

    console.log('\nUnique venue sizes:');
    Array.from(sizeSet).forEach(size => console.log(`- "${size}"`));

  } catch (err) {
    console.error('Error:', err);
  }
}

debugVenueSizes();
