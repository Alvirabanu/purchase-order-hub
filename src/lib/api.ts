import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'YOUR_PROJECT_URL_HERE',
  'YOUR_PUBLISHABLE_KEY_HERE'
)

export const productsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data ?? [] }
  },

  async create(product: any) {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  async update(id: string, product: any) {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  async delete(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  }
}

export const suppliersApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data ?? [] }
  },

  async create(vendor: any) {
    const { data, error } = await supabase
      .from('vendors')
      .insert([vendor])
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  async update(id: string, vendor: any) {
    const { data, error } = await supabase
      .from('vendors')
      .update(vendor)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  async delete(id: string) {
    const { error } = await supabase.from('vendors').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  }
}
