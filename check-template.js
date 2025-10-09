const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('name', 'ダミー黒板');
  
  if (error) {
    console.error('Error:', error);
  } else if (data && data[0]) {
    console.log('Template "ダミー黒板":');
    console.log('Fields order:', data[0].fields);
    console.log('Position:', data[0].design_settings.position);
    console.log('Size:', { width: data[0].design_settings.width, height: data[0].design_settings.height });
  }
})();
