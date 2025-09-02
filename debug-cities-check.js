// Debug script to check what cities are in the database
const { getAvailableCities } = require('./src/api/venues.ts');

async function checkCities() {
  try {
    console.log('🏙️ Checking available cities in database...');
    const cities = await getAvailableCities();
    console.log('Available cities:', cities);
    
    // Check if we need to handle Brooklyn -> New York mapping
    if (cities.includes('Brooklyn') && !cities.includes('New York')) {
      console.log('⚠️ Found Brooklyn but not New York - need to add city mapping logic');
    }
    
  } catch (error) {
    console.error('Error checking cities:', error);
  }
}

checkCities();
