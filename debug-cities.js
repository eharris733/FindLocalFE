const { createClient } = require('@supabase/supabase-js');

// Use React Native's fetch polyfill for Node.js
global.fetch = require('node-fetch');
global.Headers = require('node-fetch').Headers;
global.Request = require('node-fetch').Request;
global.Response = require('node-fetch').Response;

const supabaseUrl = 'https://axihqkwbqjwfxyxlcaib.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4aWhxa3dicWp3Znh5eGxjYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY5Mjg2NzIsImV4cCI6MjAzMjUwNDY3Mn0.6QNq9CgRnC5Z2sFI2j0M5eKWWAZCGAGKQbYj8HfHjCY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugVenuesCities() {
  console.log('🏢 Debugging venue cities...\n');

  try {
    // Get all venues to see what cities exist
    console.log('1. Fetching all venues to see available cities:');
    const { data: allVenues, error } = await supabase
      .from('venues')
      .select('id, name, city, is_active')
      .order('name');
    
    if (error) {
      console.error('   Error:', error);
      return;
    }

    console.log(`   Found ${allVenues.length} total venues`);
    
    // Get unique cities
    const cities = [...new Set(allVenues.map(v => v.city))].filter(Boolean);
    console.log('   Unique cities:', cities);
    
    // Show venue count per city
    console.log('\n2. Venue count per city:');
    cities.forEach(city => {
      const count = allVenues.filter(v => v.city === city).length;
      console.log(`   ${city}: ${count} venues`);
    });

    // Test Brooklyn specifically
    console.log('\n3. Testing Brooklyn venues:');
    const brooklynVenues = allVenues.filter(v => v.city === 'Brooklyn');
    console.log(`   Found ${brooklynVenues.length} Brooklyn venues`);
    
    if (brooklynVenues.length > 0) {
      console.log('   Sample Brooklyn venues:');
      brooklynVenues.slice(0, 5).forEach(venue => {
        console.log(`   - ${venue.name} (active: ${venue.is_active})`);
      });
    }

    // Show first few venues with their cities
    console.log('\n4. Sample of all venues with cities:');
    allVenues.slice(0, 10).forEach(venue => {
      console.log(`   - ${venue.name} | City: "${venue.city}" | Active: ${venue.is_active}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

debugVenuesCities();
