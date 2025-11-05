// scripts/insert-photo-categories.js
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// .env.local を読み込む
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Environment variables not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const photoCategories = [
  { place_code: 'dandoli-sample1', setting_type: 'photo_category', setting_id: 1, default_name: '施工前', custom_name: '施工前', display_order: 1 },
  { place_code: 'dandoli-sample1', setting_type: 'photo_category', setting_id: 2, default_name: '施工中', custom_name: '施工中', display_order: 2 },
  { place_code: 'dandoli-sample1', setting_type: 'photo_category', setting_id: 3, default_name: '施工後', custom_name: '施工後', display_order: 3 },
  { place_code: 'dandoli-sample1', setting_type: 'photo_category', setting_id: 4, default_name: '現場コメント写真', custom_name: '現場コメント写真', display_order: 4 },
  { place_code: 'dandoli-sample1', setting_type: 'photo_category', setting_id: 5, default_name: 'その他', custom_name: 'その他', display_order: 5 },
  { place_code: 'dandoli-sample1', setting_type: 'photo_category', setting_id: 6, default_name: '未分類', custom_name: '未分類', display_order: 6 },
]

async function insertPhotoCategories() {
  console.log('📸 Inserting photo categories into place_settings...')

  for (const category of photoCategories) {
    const { data, error } = await supabase
      .from('place_settings')
      .upsert(category, {
        onConflict: 'place_code,setting_type,setting_id'
      })

    if (error) {
      console.error(`❌ Failed to insert setting_id ${category.setting_id}:`, error)
    } else {
      console.log(`✅ Inserted: ${category.custom_name} (setting_id: ${category.setting_id})`)
    }
  }

  console.log('🎉 Done!')
}

insertPhotoCategories()
