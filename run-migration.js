const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local file
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables not set');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '(set)' : '(not set)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('📦 Checking if employee_code and login_id columns exist...');

  try {
    // Check if columns already exist
    const { data: existingData, error: checkError } = await supabase
      .from('users')
      .select('employee_code, login_id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Columns already exist, skipping migration');
      return;
    }

    // If columns don't exist, we need to add them via Supabase Dashboard or CLI
    console.log('⚠️  Columns do not exist yet.');
    console.log('Error:', checkError.message);
    console.log('');
    console.log('Please run this SQL in Supabase Dashboard → SQL Editor:');
    console.log('');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code TEXT;');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS login_id TEXT;');
    console.log('CREATE INDEX IF NOT EXISTS idx_users_employee_code ON users(employee_code);');
    console.log('CREATE INDEX IF NOT EXISTS idx_users_login_id ON users(login_id);');
    console.log('');

  } catch (e) {
    console.error('❌ Error:', e);
  }
}

runMigration();
