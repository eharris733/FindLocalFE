// Debug current venue cities
const { createClient } = require('@supabase/supabase-js');

// Use React Native's fetch polyfill for Node.js
global.fetch = require('node-fetch');
global.Headers = require('node-fetch').Headers;
global.Request = require('node-fetch').Request;
global.Response = require('node-fetch').Response;

// Using the correct Supabase URL from the updated config
const supabaseUrl = 'https://xykjapddmqrhsmufqajs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5a2phcGRkbXFyaHNtdWZxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1MDQ1MzMsImV4cCI6MjA1MzA4MDUzM30.vWFr4wupv7rQ3CjnGLFRW3L0qAGZFsqayBBkV_w8lyo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCurrentCities() {
  console.log('🏙️ Checking current venue cities...\n');

  try {
    // Get all venues to see what cities exist
    const { data: venues, error } = await supabase
      .from('venues')
      .select('id, name, city, is_active')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`Found ${venues.length} active venues`);
    
    // Get unique cities
    const cities = [...new Set(venues.map(v => v.city))].filter(Boolean);
    console.log('Available cities:', cities);
    
    // Check specifically for Brooklyn and New York
    const brooklynVenues = venues.filter(v => v.city === 'Brooklyn');
    const nyVenues = venues.filter(v => v.city === 'New York');
    
    console.log(`\nBrooklyn venues: ${brooklynVenues.length}`);
    console.log(`New York venues: ${nyVenues.length}`);
    
    if (brooklynVenues.length > 0) {
      console.log('\nSample Brooklyn venues:');
      brooklynVenues.slice(0, 3).forEach(v => {
        console.log(`  - ${v.name}`);
      });
    }
    
    // Show how CityPicker should behave
    console.log('\n🎯 CityPicker logic:');
    console.log(`New York should be ${cities.includes('New York') || cities.includes('Brooklyn') ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Brooklyn neighborhood should be ${cities.includes('Brooklyn') ? 'AVAILABLE' : 'UNAVAILABLE'}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCurrentCities();
