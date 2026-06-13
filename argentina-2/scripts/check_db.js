import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vqkshcozrnqfbxreuczj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_m431429UTneqaTwUWFwvhQ_EpzC-nrB'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('name, category, subcategory, tercera_categoria')
        .limit(10)

    if (error) {
        console.error('Error fetching products:', error)
        return
    }

    console.log('Sample Products:', JSON.stringify(data, null, 2))

    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .limit(100)

    if (catError) {
        console.error('Error fetching categories:', catError)
        return
    }

    console.log('Sample Categories:', JSON.stringify(categories, null, 2))
}

checkProducts()
