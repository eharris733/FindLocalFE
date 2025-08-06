// Check for data in different possible locations
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tonjvnfbywjssehdvlvp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmp2bmZieXdqc3NlaGR2bHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NDkxMzYsImV4cCI6MjA2NDIyNTEzNn0.leekVpKIqvEe8z0N2XWyVkVU35pedFat6J_7oVoaJKY';

async function findData() {
  console.log('🔍 SEARCHING FOR EVENT DATA');
  console.log('===========================');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Check for events tables with different names
  const possibleEventTables = [
    'events',
    'events_gold', 
    'events_silver',
    'events_bronze',
    'event',
    'Event',
    'EVENTS'
  ];

  console.log('\n1️⃣ Checking for events tables...');
  for (const table of possibleEventTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (!error) {
        console.log(`✅ Found table: ${table} - ${count} total rows`);
        if (data && data.length > 0) {
          console.log(`   Sample data:`, Object.keys(data[0]));
        }
      }
    } catch (err) {
      // Ignore errors for non-existent tables
    }
  }

  // Check different schemas
  console.log('\n2️⃣ Checking different schemas...');
  const schemas = ['public', 'brooklyn', 'auth', 'storage'];
  
  for (const schema of schemas) {
    try {
      console.log(`Checking schema: ${schema}`);
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        db: { schema }
      });
      
      const { data, error, count } = await client
        .from('events_gold')
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (!error && count > 0) {
        console.log(`✅ Found data in schema ${schema}: ${count} rows`);
        if (data?.[0]) {
          console.log(`   Sample:`, data[0]);
        }
      } else if (!error) {
        console.log(`   Schema ${schema}: accessible but empty`);
      }
    } catch (err) {
      console.log(`   Schema ${schema}: ${err.message}`);
    }
  }

  // Check if it's a view or different table type
  console.log('\n3️⃣ Checking table information...');
  try {
    // This might give us more info about the table structure
    const { data, error } = await supabase
      .from('events_gold')
      .select('*')
      .limit(0); // Just get structure, no data
    
    console.log('Table structure check:', {
      error: error?.message,
      accessible: !error
    });
  } catch (err) {
    console.log('Table structure error:', err.message);
  }

  console.log('\n===========================');
  console.log('🏁 Search complete!');
}

findData();
