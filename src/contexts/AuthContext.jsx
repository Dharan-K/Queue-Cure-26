import { createContext, useEffect, useState } from 'react'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import {
  createUserWithRole,
  signInUser,
  resetUserPassword,
  resendUserVerificationEmail,
  fetchUserRoleFromFirestore,
  signInUserWithGoogle
} from '../utils/authUtils'

const AuthContext = createContext()

export { AuthContext }
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  async function signup(email, password, fullName, role) {
    const user = await createUserWithRole(email, password, fullName, role)
    setUserRole(role)
    return user
  }

  async function login(email, password) {
    const user = await signInUser(email, password)
    const roleFromDb = await fetchUserRole(user.uid)
    setUserRole(roleFromDb)
    return user
  }

  async function loginWithGoogle(role) {
    const user = await signInUserWithGoogle(role)
    const roleFromDb = await fetchUserRole(user.uid)
    setUserRole(roleFromDb || role)
    return user
  }

  async function logout() {
    await signOut(auth)
  }

  async function resetPassword(email) {
    return await resetUserPassword(email)
  }

  async function resendVerificationEmail() {
    if (currentUser) {
      return await resendUserVerificationEmail(currentUser)
    }
  }



  async function fetchUserRole(uid) {
    try {
      return await fetchUserRoleFromFirestore(uid)
    } catch (error) {
      console.error('Error fetching user role:', error)
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        const role = await fetchUserRole(user.uid)
        setUserRole(role)
      } else {
        setCurrentUser(null)
        setUserRole(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    resendVerificationEmail,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
