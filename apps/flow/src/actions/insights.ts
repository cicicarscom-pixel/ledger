'use server'

import { createClient } from '@/lib/supabase/server'

export async function getAnalyticsOverview(platform: string = 'all', timeRange: string = '30d') {
  const supabase = await createClient()
  
  // Örnek bir analitik metodu (Gerçek projede ZernioClient'tan cache'lenmiş data döner)
  const { data, error } = await supabase
    .from('analytics_cache')
    .select('*')
    .eq('platform', platform)
    .eq('time_range', timeRange)
    .single()

  if (error) {
    console.error('Error fetching analytics:', error)
    return {
      totalPosts: 0,
      totalComments: 0,
      totalFollowers: 0,
      reviews: 0
    }
  }

  return {
    totalPosts: data.total_posts || 0,
    totalComments: data.total_comments || 0,
    totalFollowers: data.total_followers || 0,
    reviews: data.reviews || 0
  }
}
