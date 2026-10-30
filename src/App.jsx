import './App.css'
import { useState } from 'react'
import MapView from './MapView'
import LocationInput from './LocationInput'
import Login from './components/Login'
import Signup from './components/Signup'
function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('minutexUser')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })
  // Display the user's name instead of their email address.
  const accountName =
    loggedInUser?.fullName ||
    loggedInUser?.full_name ||
    loggedInUser?.name ||
    loggedInUser?.username ||
    'there'
  const [startLocation, setStartLocation] = useState('')
  const [destination, setDestination] = useState('')
  const [deliveries, setDeliveries] = useState([''])
  const [plannedRoute, setPlannedRoute] = useState(null)
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [routeDistance, setRouteDistance] = useState(null)
  const [isOptimized, setIsOptimized] = useState(false)
  const [dashboardSearch, setDashboardSearch] = useState('')
  const [dashboardFilter, setDashboardFilter] = useState('all')
  const resetRoute = () => {
    setPlannedRoute(null)
    setOptimizedRoute(null)
    setRouteDistance(null)
    setIsOptimized(false)
  }
  const handleRouteOptimized = (result) => {
    if (!result || !Array.isArray(result.route)) return
    setOptimizedRoute(result.route)
    setRouteDistance(
      typeof result.distanceKm === 'number'
        ? result.distanceKm
        : null
    )
    setIsOptimized(Boolean(result.optimized))
  }
  const handleSubmit = (event) => {
    event.preventDefault()
    const start = startLocation.trim()
    const end = destination.trim()
    const stops = deliveries
      .map((location) => location.trim())
      .filter(Boolean)
    if (!start || !end || stops.length === 0) return
    setOptimizedRoute(null)
    setRouteDistance(null)
    setIsOptimized(false)
    setDashboardSearch('')
    setDashboardFilter('all')
    setPlannedRoute([start, ...stops, end])
    document.getElementById('route-results')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
  const displayedRoute = optimizedRoute || plannedRoute || []
  const dashboardStops = displayedRoute.map((location, index) => ({
    id: index + 1,
    location,
    type:
      index === 0
        ? 'start'
        : index === displayedRoute.length - 1
          ? 'destination'
          : 'delivery',
    label:
      index === 0
        ? 'Starting point'
        : index === displayedRoute.length - 1
          ? 'Final destination'
          : `Delivery stop ${index}`,
  }))
  const filteredStops = dashboardStops.filter((stop) => {
    const matchesSearch = stop.location
      .toLowerCase()
      .includes(dashboardSearch.toLowerCase().trim())
    const matchesFilter =
      dashboardFilter === 'all' || stop.type === dashboardFilter
    return matchesSearch && matchesFilter
  })
  const deliveryCount = plannedRoute
    ? Math.max(0, plannedRoute.length - 2)
    : 0
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
  // Display the Login page.
  if (currentPage === 'login') {
    return (
      <Login
        onShowSignup={() => setCurrentPage('signup')}
        onLogin={(userData) => {
          const user =
            userData && typeof userData === 'object' ? userData : {}
          setLoggedInUser(user)
          try {
            sessionStorage.setItem('minutexUser', JSON.stringify(user))
          } catch (error) {
            console.warn('Could not save the current session user.', error)
          }
          setCurrentPage('home')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    )
  }
  // Display the Sign Up page.
  if (currentPage === 'signup') {
    return (
      <Signup
        onShowLogin={() => setCurrentPage('login')}
        onSignup={() => {
          setCurrentPage('login')
        }}
      />
    )
  }
  // Main MinuteX homepage.
  return (
    <div className="app">
      <header className="navbar">
        <a
          className="logo"
          href="#home"
          aria-label="MinuteX home"
          onClick={() => setCurrentPage('home')}
        >
          <span className="logo-icon">M</span>
          <span>MinuteX</span>
        </a>
        <nav>
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#dashboard" onClick={(event) => { if (!loggedInUser) { event.preventDefault(); setCurrentPage('login') } }}>Dashboard</a>
          <a href="#planner" onClick={(event) => { if (!loggedInUser) { event.preventDefault(); setCurrentPage('login') } }}>Planner</a>
        </nav>
        <div className="nav-actions">
          {loggedInUser ? (
            <>
              <button
                type="button"
                className="login-nav-button"
                onClick={() => scrollTo('dashboard')}
                title="Your MinuteX account"
              >
                Hi, {accountName}
              </button>
              <button
                type="button"
                className="nav-button"
                onClick={() => {
                  setLoggedInUser(null)
                  // Clear the previous user's route and dashboard data.
                  setStartLocation('')
                  setDestination('')
                  setDeliveries([''])
                  setPlannedRoute(null)
                  setOptimizedRoute(null)
                  setRouteDistance(null)
                  setIsOptimized(false)
                  setDashboardSearch('')
                  setDashboardFilter('all')
                  try {
                    sessionStorage.removeItem('minutexUser')
                  } catch (error) {
                    console.warn('Could not clear the current session user.', error)
                  }
                  setCurrentPage('home')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="login-nav-button"
                onClick={() => setCurrentPage('login')}
              >
                Login
              </button>
              <button
                type="button"
                className="nav-button"
                onClick={() => setCurrentPage('signup')}
              >
                Sign Up
              </button>
            </>
          )}
          <button
            type="button"
            className="nav-button"
            onClick={() => loggedInUser ? scrollTo('planner') : setCurrentPage('login')}
          >
            Plan a Route →
          </button>
        </div>
      </header>
      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="tag">SMARTER DELIVERY PLANNING</span>
            <h1>
              Every Order.
              <br />
              Every Route.
              <br />
              <span>Optimized.</span>
            </h1>
            <p>
              Plan multiple deliveries efficiently, reduce unnecessary
              travel, and make smarter delivery decisions with MinuteX.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => loggedInUser ? scrollTo('planner') : setCurrentPage('login')}
            >
              Explore the Planner <span>→</span>
            </button>
            <div className="hero-note">
              <span className="status-dot" />
              Your smarter delivery journey starts here
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-top">
              <span>DELIVERY OVERVIEW</span>
              <span className="live-badge">● READY</span>
            </div>
            <div className="route-card">
              <div className="route-heading">
                <div>
                  <span className="muted">YOUR NEXT JOURNEY</span>
                  <h3>Delivery Route</h3>
                </div>
                <div className="route-symbol">↗</div>
              </div>
              <div className="route-map">
                <div className="map-road road-one" />
                <div className="map-road road-two" />
                <div className="map-road road-three" />
                <div className="route-line" />
                <div className="map-point point-one">A</div>
                <div className="map-point point-two">B</div>
                <div className="map-point point-three">C</div>
                <div className="map-point point-four">D</div>
              </div>
              <div className="route-footer">
                <div>
                  <span className="muted">DELIVERY STOPS</span>
                  <strong>
                    {plannedRoute ? deliveryCount : 'Ready to plan'}
                  </strong>
                </div>
                <div>
                  <span className="muted">ROUTE STATUS</span>
                  <strong className="green-text">
                    {isOptimized ? 'Optimized' : 'Awaiting route'}
                  </strong>
                </div>
              </div>
            </div>
            <div className="floating-card">
              <span className="floating-icon">✦</span>
              <div>
                <strong>Plan smarter</strong>
                <p>One organized journey</p>
              </div>
            </div>
          </div>
        </section>
        <section className="features" id="features">
          <div className="section-heading">
            <span className="tag">BUILT FOR BETTER DELIVERIES</span>
            <h2>Less complexity. More efficiency.</h2>
            <p>
              Everything starts with a smarter way to plan your deliveries.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon purple">⌖</div>
              <h3>Route Optimization</h3>
              <p>Organize delivery stops into a more efficient route.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon green">↗</div>
              <h3>Multiple Orders</h3>
              <p>Plan several deliveries in one organized workflow.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon orange">◷</div>
              <h3>Route Insights</h3>
              <p>Review your planned stops and calculated road distance.</p>
            </article>
          </div>
        </section>
        {/* Interactive dashboard */}
        {loggedInUser && (
        <section className="dashboard-section" id="dashboard">
          <div className="dashboard-heading">
            <div>
              <span className="tag">YOUR WORKSPACE</span>
              <h2>
                {loggedInUser
                  ? `Welcome back, ${accountName}!`
                  : 'Delivery dashboard'}
              </h2>
              <p>
                {loggedInUser
                  ? 'Your delivery workspace is ready. Plan and review your journey from one place.'
                  : 'Your route at a glance. Plan, review, and manage your delivery journey from one place.'}
              </p>
            </div>
            <button
              type="button"
              className="primary-button dashboard-action"
              onClick={() => scrollTo('planner')}
            >
              + Plan deliveries
            </button>
          </div>
          <div className="dashboard-stat-grid">
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon purple">⌖</span>
                <span className="dashboard-stat-caption">ROUTE</span>
              </div>
              <span className="dashboard-stat-value">
                {plannedRoute ? deliveryCount : '—'}
              </span>
              <span className="dashboard-stat-label">Delivery stops</span>
              <span className="dashboard-stat-note">
                {plannedRoute
                  ? 'Stops in your current journey'
                  : 'Plan a route to get started'}
              </span>
            </article>
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon green">↗</span>
                <span className="dashboard-stat-caption">DISTANCE</span>
              </div>
              <span className="dashboard-stat-value">
                {routeDistance !== null
                  ? routeDistance.toLocaleString('en-IN', {
                      maximumFractionDigits: 1,
                    })
                  : '—'}
                <small>{routeDistance !== null ? ' km' : ''}</small>
              </span>
              <span className="dashboard-stat-label">Road distance</span>
              <span className="dashboard-stat-note">
                {routeDistance !== null
                  ? 'Calculated driving distance'
                  : 'Available after route calculation'}
              </span>
            </article>
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon orange">◎</span>
                <span className="dashboard-stat-caption">STATUS</span>
              </div>
              <span className="dashboard-stat-value dashboard-status-value">
                {isOptimized
                  ? 'Optimized'
                  : plannedRoute
                    ? 'In progress'
                    : 'Not started'}
              </span>
              <span className="dashboard-stat-label">Current route</span>
              <span className="dashboard-stat-note">
                {isOptimized
                  ? 'Stop order calculated'
                  : plannedRoute
                    ? 'Waiting for route results'
                    : 'Your workspace is ready'}
              </span>
            </article>
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon blue">⇄</span>
                <span className="dashboard-stat-caption">JOURNEY</span>
              </div>
              <span className="dashboard-stat-value">
                {plannedRoute ? plannedRoute.length : '—'}
              </span>
              <span className="dashboard-stat-label">Total route points</span>
              <span className="dashboard-stat-note">
                Includes start and final destination
              </span>
            </article>
          </div>
          <div className="dashboard-content-grid">
            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <span className="tag">ROUTE MANAGEMENT</span>
                  <h3>Your delivery stops</h3>
                </div>
                <span className="dashboard-count">
                  {dashboardStops.length} points
                </span>
              </div>
              <div className="dashboard-controls">
                <div className="dashboard-search-wrap">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    value={dashboardSearch}
                    onChange={(event) =>
                      setDashboardSearch(event.target.value)
                    }
                    placeholder="Search locations..."
                    aria-label="Search route locations"
                  />
                </div>
                <select
                  value={dashboardFilter}
                  onChange={(event) =>
                    setDashboardFilter(event.target.value)
                  }
                  aria-label="Filter route points"
                  className="dashboard-filter"
                >
                  <option value="all">All points</option>
                  <option value="start">Starting point</option>
                  <option value="delivery">Delivery stops</option>
                  <option value="destination">Final destination</option>
                </select>
              </div>
              {filteredStops.length > 0 ? (
                <div className="dashboard-stop-list">
                  {filteredStops.map((stop) => (
                    <article
                      className="dashboard-stop-row"
                      key={`${stop.id}-${stop.location}`}
                    >
                      <span className={`dashboard-stop-marker ${stop.type}`}>
                        {stop.type === 'start'
                          ? 'S'
                          : stop.type === 'destination'
                            ? 'E'
                            : stop.id - 1}
                      </span>
                      <div className="dashboard-stop-info">
                        <strong>{stop.location}</strong>
                        <span>{stop.label}</span>
                      </div>
                      <span className={`dashboard-stop-badge ${stop.type}`}>
                        {stop.type === 'start'
                          ? 'START'
                          : stop.type === 'destination'
                            ? 'END'
                            : 'STOP'}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <span className="dashboard-empty-icon">⌕</span>
                  <h4>
                    {plannedRoute
                      ? 'No matching locations'
                      : 'Your route starts here'}
                  </h4>
                  <p>
                    {plannedRoute
                      ? 'Try a different search or filter.'
                      : 'Prepare a route to see your stops and journey details here.'}
                  </p>
                  {!plannedRoute && (
                    <button
                      type="button"
                      className="dashboard-text-button"
                      onClick={() => scrollTo('planner')}
                    >
                      Create your first route →
                    </button>
                  )}
                </div>
              )}
              <div className="dashboard-panel-footer">
                <span>
                  Showing {filteredStops.length} of {dashboardStops.length}{' '}
                  route points
                </span>
                {plannedRoute && (
                  <button
                    type="button"
                    className="dashboard-text-button"
                    onClick={() => scrollTo('route-results')}
                  >
                    View route details →
                  </button>
                )}
              </div>
            </section>
            <aside className="dashboard-panel dashboard-route-panel">
              <span className="tag">JOURNEY OVERVIEW</span>
              <h3>Route summary</h3>
              <p className="dashboard-panel-description">
                A quick overview of your current delivery journey.
              </p>
              <div className="dashboard-route-summary">
                <div className="dashboard-summary-line">
                  <span className="dashboard-summary-dot start" />
                  <div>
                    <span>STARTING POINT</span>
                    <strong>{displayedRoute[0] || 'Not selected yet'}</strong>
                  </div>
                </div>
                <div className="dashboard-summary-connector" />
                <div className="dashboard-summary-line">
                  <span className="dashboard-summary-dot delivery" />
                  <div>
                    <span>DELIVERY STOPS</span>
                    <strong>
                      {plannedRoute
                        ? `${deliveryCount} stop${deliveryCount === 1 ? '' : 's'}`
                        : 'No stops added'}
                    </strong>
                  </div>
                </div>
                <div className="dashboard-summary-connector" />
                <div className="dashboard-summary-line">
                  <span className="dashboard-summary-dot end" />
                  <div>
                    <span>FINAL DESTINATION</span>
                    <strong>
                      {displayedRoute.length > 1
                        ? displayedRoute[displayedRoute.length - 1]
                        : 'Not selected yet'}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="dashboard-distance-box">
                <span>CALCULATED ROAD DISTANCE</span>
                <strong>
                  {routeDistance !== null
                    ? `${routeDistance.toLocaleString('en-IN', {
                        maximumFractionDigits: 1,
                      })} km`
                    : 'Awaiting route'}
                </strong>
              </div>
              <button
                type="button"
                className="primary-button dashboard-full-button"
                onClick={() => scrollTo('planner')}
              >
                {plannedRoute ? 'Plan another route' : 'Start planning'}{' '}
                <span>→</span>
              </button>
              {plannedRoute && (
                <button
                  type="button"
                  className="dashboard-secondary-button"
                  onClick={() => scrollTo('map-section')}
                >
                  View interactive map
                </button>
              )}
            </aside>
          </div>
          <p className="dashboard-disclaimer">
            {loggedInUser
              ? 'You are signed in to MinuteX. Route details currently remain in this browser session.'
              : 'Route statistics reflect the current route in this browser. Sign in to see your account in the workspace.'}
          </p>
        </section>
        )}
        {/* Delivery planner */}
        {loggedInUser && (
        <section className="planner" id="planner">
          <span className="tag">YOUR DELIVERY WORKSPACE</span>
          <h2>Plan your deliveries.</h2>
          <p>
            Search for locations, select suggestions, and organize your
            delivery journey.
          </p>
          <form className="planner-form" onSubmit={handleSubmit}>
            <div className="planner-field">
              <label htmlFor="start-location">Starting location</label>
              <LocationInput
                id="start-location"
                value={startLocation}
                onChange={(value) => {
                  setStartLocation(value)
                  resetRoute()
                }}
                placeholder="Search starting location..."
                required
              />
            </div>
            <div className="planner-field">
              <label>Delivery stops</label>
              {deliveries.map((location, index) => (
                <div className="delivery-input-row" key={index}>
                  <LocationInput
                    id={`delivery-${index}`}
                    value={location}
                    onChange={(value) => {
                      setDeliveries((current) =>
                        current.map((item, i) =>
                          i === index ? value : item
                        )
                      )
                      resetRoute()
                    }}
                    placeholder={`Search delivery location ${index + 1}...`}
                    required
                  />
                  <button
                    type="button"
                    className="remove-stop-button"
                    aria-label={`Remove delivery stop ${index + 1}`}
                    disabled={deliveries.length === 1}
                    onClick={() => {
                      setDeliveries((current) =>
                        current.filter((_, i) => i !== index)
                      )
                      resetRoute()
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-stop-button"
                onClick={() => {
                  setDeliveries((current) => [...current, ''])
                  resetRoute()
                }}
              >
                + Add another delivery
              </button>
            </div>
            <div className="planner-field">
              <label htmlFor="final-destination">Final destination</label>
              <LocationInput
                id="final-destination"
                value={destination}
                onChange={(value) => {
                  setDestination(value)
                  resetRoute()
                }}
                placeholder="Search final destination..."
                required
              />
            </div>
            <button type="submit" className="primary-button planner-submit">
              Prepare My Route <span>→</span>
            </button>
          </form>
          {plannedRoute && (
            <div
              className="planner-results"
              id="route-results"
              aria-live="polite"
            >
              <span className="tag">YOUR ROUTE PREVIEW</span>
              <h3>
                {isOptimized
                  ? 'Your optimized journey'
                  : 'Delivery journey ready!'}
              </h3>
              <p>
                {isOptimized
                  ? 'Your delivery stops are arranged in the calculated road-distance order.'
                  : `${plannedRoute.length - 2} delivery stop(s) entered. Calculating the best available road route...`}
              </p>
              {routeDistance !== null && (
                <p className="route-distance">
                  <strong>Road distance:</strong> {routeDistance.toFixed(1)} km
                </p>
              )}
              <ol className="planned-stop-list">
                {displayedRoute.map((location, index) => (
                  <li key={`${location}-${index}`}>
                    <span className="stop-number">{index + 1}</span>
                    <span>{location}</span>
                    {index === 0 && (
                      <span className="stop-label">START</span>
                    )}
                    {index === displayedRoute.length - 1 && (
                      <span className="stop-label">END</span>
                    )}
                    {index > 0 && index < displayedRoute.length - 1 && (
                      <span className="stop-label">STOP {index}</span>
                    )}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="add-stop-button"
                onClick={resetRoute}
              >
                Edit locations
              </button>
            </div>
          )}
          <div className="map-section" id="map-section">
            <h3>Delivery Route Map</h3>
            <p>
              View your locations and calculated driving route on the
              interactive map.
            </p>
            <MapView
              key={loggedInUser?.id || 'logged-out'}
              route={plannedRoute || []}
              onRouteOptimized={handleRouteOptimized}
            />
          </div>
        </section>
        )}
      </main>
      <footer id="about">
        <a className="logo" href="#home">
          <span className="logo-icon">M</span>
          <span>MinuteX</span>
        </a>
        <p>Smarter planning for every delivery.</p>
        <span>© 2026 MinuteX</span>
      </footer>
    </div>
  )
}
export default App
