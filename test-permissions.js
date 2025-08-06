// Comprehensive Supabase permissions test
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tonjvnfbywjssehdvlvp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmp2bmZieXdqc3NlaGR2bHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NDkxMzYsImV4cCI6MjA2NDIyNTEzNn0.leekVpKIqvEe8z0N2XWyVkVU35pedFat6J_7oVoaJKY';

async function testPermissions() {
  console.log('🔍 COMPREHENSIVE SUPABASE PERMISSIONS TEST');
  console.log('==========================================');
  
  // Test 1: Default schema (should be public)
  console.log('\n1️⃣ Testing with default schema...');
  const supabaseDefault = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error, status } = await supabaseDefault
      .from('events_gold')
      .select('*')
      .limit(3);
    
    console.log('Default schema result:', {
      success: !error,
      count: data?.length || 0,
      status,
      error: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    });
  } catch (err) {
    console.log('Default schema error:', err);
  }

  // Test 2: Explicit public schema
  console.log('\n2️⃣ Testing with explicit public schema...');
  const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'public' }
  });
  
  try {
    const { data, error, status } = await supabasePublic
      .from('events_gold')
      .select('*')
      .limit(3);
    
    console.log('Public schema result:', {
      success: !error,
      count: data?.length || 0,
      status,
      error: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    });
  } catch (err) {
    console.log('Public schema error:', err);
  }

  // Test 3: Try different table references
  console.log('\n3️⃣ Testing different table references...');
  
  const tableVariations = [
    'events_gold',
    'public.events_gold',
    '"events_gold"',
    '"public"."events_gold"'
  ];

  for (const table of tableVariations) {
    try {
      console.log(`Testing table reference: ${table}`);
      const { data, error } = await supabasePublic
        .from(table)
        .select('id')
        .limit(1);
      
      console.log(`  Result: ${error ? 'FAILED' : 'SUCCESS'} - ${error?.message || `${data?.length || 0} rows`}`);
    } catch (err) {
      console.log(`  Result: ERROR - ${err.message}`);
    }
  }

  // Test 4: Check specific columns
  console.log('\n4️⃣ Testing specific column access...');
  try {
    const { data, error } = await supabasePublic
      .from('events_gold')
      .select('id, title, city, event_date')
      .limit(1);
    
    console.log('Column access result:', {
      success: !error,
      count: data?.length || 0,
      error: error?.message,
      sample: data?.[0]
    });
  } catch (err) {
    console.log('Column access error:', err);
  }

  // Test 5: Test count query
  console.log('\n5️⃣ Testing count query...');
  try {
    const { count, error } = await supabasePublic
      .from('events_gold')
      .select('*', { count: 'exact', head: true });
    
    console.log('Count query result:', {
      success: !error,
      count,
      error: error?.message
    });
  } catch (err) {
    console.log('Count query error:', err);
  }

  // Test 6: Test venues table for comparison
  console.log('\n6️⃣ Testing venues table (known working)...');
  try {
    const { data, error } = await supabasePublic
      .from('venues')
      .select('id, name, city')
      .limit(2);
    
    console.log('Venues comparison:', {
      success: !error,
      count: data?.length || 0,
      error: error?.message,
      sample: data?.[0]
    });
  } catch (err) {
    console.log('Venues error:', err);
  }

  console.log('\n==========================================');
  console.log('🏁 Test complete!');
}

testPermissions();
