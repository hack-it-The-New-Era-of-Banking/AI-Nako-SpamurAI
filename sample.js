// Load environment variables
require('dotenv').config();

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Function to fetch data from a table
async function fetchData() {
  // Query a table (replace 'your_table_name' with your actual table name)
  const { data, error } = await supabase
    .from('test_table') // Specify your table name here
    .select('test');  // You can specify columns or use '*' to get all
    
    if (error) {
        console.error('Error fetching data:', error);
        return;
      }
    
      if (data.length === 0) {
        console.log('No data found in the table.');
      } else {
        console.log('Fetched data:', data);
      }
    }
    
    fetchData();