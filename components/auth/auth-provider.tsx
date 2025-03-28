"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Amplify } from "aws-amplify"
import { signIn, signUp, confirmSignUp, signOut, getCurrentUser, fetchAuthSession } from "aws-amplify/auth"

// Import the checkAdminStatus function at the top
import { checkAdminStatus } from "@/lib/api"

// Configure Amplify with v6+ format
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
      loginWith: {
        email: true,
        username: true,
      },
    },
  },
})

type AuthContextType = {
  user: any
  token: string | null
  isLoading: boolean
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  signup: (username: string, password: string, email: string) => Promise<void>
  confirmSignup: (username: string, code: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuthState()
  }, [])

  // Update the checkAuthState function to use the API endpoint
  async function checkAuthState() {
    try {
      setIsLoading(true)
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()
      const idToken = session.tokens?.idToken?.toString()

      setUser(currentUser)
      setToken(idToken || null)

      // Store token in cookie for server components
      if (idToken) {
        document.cookie = `auth_token=${idToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`

        // Check admin status using the API endpoint
        const adminStatus = await checkAdminStatus()
        setIsAdmin(adminStatus)
      }
    } catch (error) {
      setUser(null)
      setToken(null)
      setIsAdmin(false)
      document.cookie = "auth_token=; path=/; max-age=0"
    } finally {
      setIsLoading(false)
    }
  }

  // Update the login function to check admin status after login
  async function login(username: string, password: string) {
    try {
      setIsLoading(true)

      // Check if there's already a signed in user
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          // User is already signed in, just navigate to dashboard
          router.push("/dashboard")
          return
        }
      } catch (error) {
        // No user is signed in, continue with login
      }

      await signIn({ username, password })
      const session = await fetchAuthSession()
      const idToken = session.tokens?.idToken?.toString()
      const currentUser = await getCurrentUser()

      setUser(currentUser)
      setToken(idToken || null)

      // Store token in cookie for server components
      if (idToken) {
        document.cookie = `auth_token=${idToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`

        // Check admin status using the API endpoint
        const adminStatus = await checkAdminStatus()
        setIsAdmin(adminStatus)
      }

      router.push("/dashboard")
    } catch (error) {
      console.error("Login error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function signup(username: string, password: string, email: string) {
    try {
      setIsLoading(true)
      await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      })
    } catch (error) {
      console.error("Signup error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function confirmSignup(username: string, code: string) {
    try {
      setIsLoading(true)
      await confirmSignUp({
        username,
        confirmationCode: code,
      })
    } catch (error) {
      console.error("Confirm signup error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function logout() {
    try {
      setIsLoading(true)
      await signOut()
      setUser(null)
      setToken(null)
      setIsAdmin(false)
      document.cookie = "auth_token=; path=/; max-age=0"
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    user,
    token,
    isLoading,
    isAdmin,
    login,
    signup,
    confirmSignup,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

