import { useState } from 'react'

function Login({ onLogin, onShowSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      alert('Please enter your email and password.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        alert(data.message || 'Login failed. Please try again.')
        return
      }

      alert(data.message || 'Login successful!')

      if (onLogin) {
        onLogin(
          data.user && typeof data.user === 'object'
            ? data.user
            : { email: email.trim() },
        )
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Cannot connect to MinuteX backend. Please check that Flask is running.')
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
          <span className="tag">WELCOME BACK</span>
          <h1>Sign in to MinuteX</h1>
          <p>Manage your deliveries and continue planning smarter routes.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <div className="auth-password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
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

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
            {!loading && <span> →</span>}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button type="button" onClick={onShowSignup}>
            Create account
          </button>
        </p>

        <p className="auth-note">Your delivery workspace, all in one place.</p>
      </section>

      <a className="auth-back-link" href="#home">
        ← Back to MinuteX home
      </a>
    </main>
  )
}

export default Login
