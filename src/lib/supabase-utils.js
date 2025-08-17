// lib/supabase-utils.js

import { supabase } from './supabase'

/**
 * Wrapper for Supabase queries that handles auth token refresh issues
 * @param {Function} queryFn - The query function to execute
 * @param {Object} options - Options for retry behavior
 * @returns {Promise} - The query result
 */
export async function executeAuthQuery(queryFn, options = {}) {
  const maxRetries = options.maxRetries || 3
  const retryDelay = options.retryDelay || 1000
  let lastError = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Execute the query
      const result = await queryFn()
      
      // Check for auth-related errors
      if (result.error) {
        const errorMessage = result.error.message?.toLowerCase() || ''
        const errorCode = result.error.code?.toLowerCase() || ''
        
        // Check if this is an auth/token error
        if (
          errorMessage.includes('jwt') ||
          errorMessage.includes('token') ||
          errorMessage.includes('unauthorized') ||
          errorCode === 'pgrst301' || // JWT expired
          errorCode === '401'
        ) {
          console.log(`Auth error detected on attempt ${attempt + 1}, refreshing session...`)
          
          // Try to refresh the session
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError)
            lastError = refreshError
            
            // If this is the last attempt, throw the error
            if (attempt === maxRetries - 1) {
              throw refreshError
            }
          } else if (session) {
            console.log('Session refreshed, retrying query...')
            // Wait a bit for the new token to propagate
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            continue // Retry the query
          }
        } else {
          // Non-auth error, return as-is
          return result
        }
      } else {
        // Success!
        return result
      }
    } catch (error) {
      console.error(`Query attempt ${attempt + 1} failed:`, error)
      lastError = error
      
      // If this is not the last attempt, wait and retry
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  // All retries failed
  throw lastError || new Error('Query failed after retries')
}

/**
 * Example usage in components:
 * 
 * const loadPurchases = async () => {
 *   const result = await executeAuthQuery(async () => {
 *     return await supabase
 *       .from('purchases')
 *       .select('*')
 *       .eq('user_id', user.id)
 *   })
 *   
 *   if (result.data) {
 *     setPurchases(result.data)
 *   }
 * }
 */