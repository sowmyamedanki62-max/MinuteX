
import { useState } from 'react'

function Signup({ onSignup, onShowLogin }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (password.length < 8) {
      alert('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://127.0.0.1:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Signup failed.')
        return
      }

      alert('Account created successfully! Please sign in.')

      if (onSignup) {
        onSignup(data.user)
      }

      if (onShowLogin) {
        onShowLogin()
      }
    } catch (error) {
      alert('Cannot connect to MinuteX backend. Make sure Flask is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <a className="auth-logo" href="#home">
        <span className="auth-logo-icon">M</span>
        <span>MinuteX</span>
      </a>

      <section className="auth-card">
        <div className="auth-heading">
          <span className="tag">GET STARTED</span>
          <h1>Create your account</h1>
          <p>Join MinuteX and organize your delivery journeys in one place.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <div className="auth-password-wrap">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-confirm-password">Confirm password</label>
            <input
              id="signup-confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password again"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
            <span>→</span>
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" onClick={onShowLogin}>
            Sign in
          </button>
        </p>

        <p className="auth-note">
          Smarter planning starts with MinuteX.
        </p>
      </section>

      <a className="auth-back-link" href="#home">
        ← Back to MinuteX home
      </a>
    </main>
  )
}

export default Signup
