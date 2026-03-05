const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  try {
    const { data, error } = await supabase
      .from('testsanswers')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('COLUMNS_LIST:' + Object.keys(data[0]).join(','));
    } else {
      console.log('No data found');
    }
  } catch (e) {
    console.error(e);
  }
}

checkColumns();
