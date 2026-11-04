import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,
    mfaToken: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    fullName: (state) => {
      if (!state.user) return ''
      return `${state.user.firstName || ''} ${state.user.lastName || ''}`.trim()
    },
  },

  actions: {
    setSession(data) {
      this.token = data.token
      this.user = data.user
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    },

    // Keep the stored details (and a re-issued token) in step after a profile change.
    updateUser(user, token) {
      this.user = { ...this.user, ...user }
      localStorage.setItem('user', JSON.stringify(this.user))
      if (token) {
        this.token = token
        localStorage.setItem('token', token)
      }
    },

    // Returns { mfaRequired, methods, emailTo } when two-step verification is on; the
    // session is only created once the second step is done.
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.mfaRequired) {
        this.mfaToken = data.mfaToken // memory only, never stored
        return { mfaRequired: true, methods: data.methods, emailTo: data.emailTo }
      }
      this.setSession(data)
      return { mfaRequired: false }
    },

    // method: 'phone' (number to show, approve on phone) | 'email' (code mailed)
    async mfaChallenge(method) {
      const { data } = await api.post('/auth/mfa/challenge', { mfaToken: this.mfaToken, method })
      return data // phone: { challengeId, number, expiresIn }; email: { challengeId, expiresIn, sentTo }
    },

    // Phone approval: poll until the user taps Approve on their phone.
    async mfaPoll(challengeId) {
      const { data } = await api.post('/auth/mfa/poll', { mfaToken: this.mfaToken, challengeId })
      if (data.status === 'approved') {
        this.mfaToken = null
        this.setSession(data)
      }
      return data.status // pending | approved | denied | expired
    },

    // method: 'totp' | 'email' | 'recovery'
    async mfaVerify({ method, challengeId, code }) {
      const body = { mfaToken: this.mfaToken, method, challengeId }
      if (method === 'recovery') body.recoveryCode = code
      else body.code = code
      const { data } = await api.post('/auth/mfa/verify', body)
      this.mfaToken = null
      this.setSession(data)
    },

    async register(firstName, lastName, email, password) {
      const { data } = await api.post('/auth/register', {
        firstName,
        lastName,
        email,
        password,
        confirmPassword: password,
      })
      this.token = data.token
      this.user = data.user
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    },

    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
  },
})
