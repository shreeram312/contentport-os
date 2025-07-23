'use client'

import { authClient } from '@/lib/auth-client'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import posthog from 'posthog-js'

const LoginPage = () => {
  const handleAccess = async () => {
    const { data, error } = await authClient.signIn.social({ provider: 'google' })

    if (error) {
      posthog.captureException(error)

      toast.error(
        error.message ?? 'An error occurred, please DM @joshtriedcoding on twitter!',
      )
    }
  }

  useEffect(() => {
    handleAccess()
  }, [])

  return null
}

export default LoginPage
