const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://axihqkwbqjwfxyxlcaib.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4aWhxa3dicWp3Znh5eGxjYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY5Mjg2NzIsImV4cCI6MjAzMjUwNDY3Mn0.6QNq9CgRnC5Z2sFI2j0M5eKWWAZCGAGKQbYj8HfHjCY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugVenues() {
  console.log('🏢 Testing venue fetching...\n');

  try {
    // Test getAllVenues
    console.log('1. Testing getAllVenues():');
    const allVenues = await supabase
      .from('venues')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    console.log(`   Found ${allVenues.data?.length || 0} total venues`);
    if (allVenues.error) {
      console.error('   Error:', allVenues.error);
    }

    // Test getVenuesByCity('Brooklyn')
    console.log('\n2. Testing getVenuesByCity("Brooklyn"):');
    const brooklynVenues = await supabase
      .from('venues')
      .select('*')
      .eq('city', 'Brooklyn')
      .eq('is_active', true)
      .order('name');
    
    console.log(`   Found ${brooklynVenues.data?.length || 0} Brooklyn venues`);
    if (brooklynVenues.error) {
      console.error('   Error:', brooklynVenues.error);
    }

    // Show sample venues
    if (brooklynVenues.data && brooklynVenues.data.length > 0) {
      console.log('\n   Sample Brooklyn venues:');
      brooklynVenues.data.slice(0, 5).forEach((venue, i) => {
        console.log(`   ${i + 1}. ${venue.name} (ID: ${venue.id}, City: ${venue.city})`);
      });
    }

    // Check unique cities
    console.log('\n3. Checking unique cities in venues table:');
    const citiesQuery = await supabase
      .from('venues')
      .select('city')
      .eq('is_active', true);
    
    if (citiesQuery.data) {
      const uniqueCities = [...new Set(citiesQuery.data.map(v => v.city))];
      console.log('   Unique cities:', uniqueCities);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugVenues();
