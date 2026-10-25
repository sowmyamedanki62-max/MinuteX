import { useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function MapUpdater({ locations }) {
  const map = useMap()

  useEffect(() => {
    if (locations.length === 1) {
      map.setView(locations[0].position, 13)
    } else if (locations.length > 1) {
      map.fitBounds(
        locations.map((item) => item.position),
        { padding: [35, 35] }
      )
    }
  }, [locations, map])

  return null
}

// Retry temporary network errors before reporting a failure.
async function fetchWithRetry(url, attempts = 3) {
  let lastError

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Service returned HTTP ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error

      if (attempt < attempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 700 * (attempt + 1))
        )
      }
    }
  }

  throw lastError || new Error('Network request failed')
}

// Find coordinates using the location-search service.
async function findCoordinates(name) {
  const queries = [name, `${name}, India`]

  for (const query of queries) {
    try {
      const url =
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`

      const response = await fetchWithRetry(url, 2)
      const data = await response.json()
      const feature = data.features?.[0]

      if (feature?.geometry?.coordinates?.length >= 2) {
        const [longitude, latitude] =
          feature.geometry.coordinates

        return [Number(latitude), Number(longitude)]
      }
    } catch {
      // Try the next query before reporting the location as unavailable.
    }
  }

  throw new Error(
    `Could not find "${name}". Please select a location suggestion and try again.`
  )
}

// Measure the full route using road-distance values from OSRM.
function measureOrder(order, distances) {
  let total = 0

  for (let i = 0; i < order.length - 1; i++) {
    const distance = distances[order[i]]?.[order[i + 1]]

    if (typeof distance !== 'number') {
      return Infinity
    }

    total += distance
  }

  return total
}

function findBestOrder(distances, stopCount) {
  const destination = stopCount - 1
  const stops = Array.from(
    { length: Math.max(0, stopCount - 2) },
    (_, index) => index + 1
  )

  if (stops.length === 0) {
    return [0, destination]
  }

  // For small lists, examine every possible delivery-stop order.
  if (stops.length <= 8) {
    let bestOrder = null
    let bestDistance = Infinity

    function permute(remaining, current) {
      if (remaining.length === 0) {
        const candidate = [0, ...current, destination]
        const distance = measureOrder(candidate, distances)

        if (distance < bestDistance) {
          bestDistance = distance
          bestOrder = candidate
        }

        return
      }

      for (let i = 0; i < remaining.length; i++) {
        const next = remaining[i]
        const rest = remaining.filter((_, index) => index !== i)

        permute(rest, [...current, next])
      }
    }

    permute(stops, [])

    return bestOrder || [0, ...stops, destination]
  }

  // For larger lists, start with the nearest available road-distance stop.
  const remaining = [...stops]
  const order = [0]
  let current = 0

  while (remaining.length > 0) {
    let nearestIndex = -1
    let nearestDistance = Infinity

    remaining.forEach((stop, index) => {
      const distance = distances[current]?.[stop]

      if (
        typeof distance === 'number' &&
        distance < nearestDistance
      ) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    if (nearestIndex === -1) {
      return [0, ...stops, destination]
    }

    current = remaining.splice(nearestIndex, 1)[0]
    order.push(current)
  }

  order.push(destination)

  // Improve the initial order by testing local changes.
  let improved = true
  let passes = 0

  while (improved && passes < 20) {
    improved = false
    passes++

    for (let i = 1; i < order.length - 2; i++) {
      for (let j = i + 1; j < order.length - 1; j++) {
        const candidate = [
          ...order.slice(0, i),
          ...order.slice(i, j + 1).reverse(),
          ...order.slice(j + 1),
        ]

        if (
          measureOrder(candidate, distances) <
          measureOrder(order, distances)
        ) {
          order.splice(0, order.length, ...candidate)
          improved = true
        }
      }
    }
  }

  return order
}

function MapView({ route = [], onRouteOptimized }) {
  const defaultCenter = [17.6868, 83.2185]
  const [locations, setLocations] = useState([])
  const [roadCoordinates, setRoadCoordinates] = useState([])
  const [status, setStatus] = useState('')

  // Keep the latest callback without restarting route calculation
  // whenever the parent component renders.
  const callbackRef = useRef(onRouteOptimized)
  callbackRef.current = onRouteOptimized

  useEffect(() => {
    let cancelled = false

    async function findLocationsAndRoute() {
      setLocations([])
      setRoadCoordinates([])

      const names = Array.isArray(route)
        ? route
            .filter((name) => typeof name === 'string')
            .map((name) => name.trim())
            .filter(Boolean)
        : []

      if (names.length < 2) {
        setStatus(
          names.length === 0
            ? 'Enter locations and prepare your route.'
            : 'Enter a starting location and destination.'
        )
        return
      }

      let stage = 'location lookup'

      try {
        setStatus('Finding your locations...')

        const found = []

        for (const name of names) {
          const position = await findCoordinates(name)

          if (cancelled) return

          found.push({ name, position })
        }

        if (cancelled) return

        let orderedLocations = found
        let optimized = false

        stage = 'road-distance comparison'
        setStatus('Comparing road distances to optimize your stops...')

        const coordinates = found
          .map(
            (item) =>
              `${item.position[1]},${item.position[0]}`
          )
          .join(';')

        try {
          const tableUrl =
            `https://router.project-osrm.org/table/v1/driving/${coordinates}?annotations=distance`

          const tableResponse = await fetchWithRetry(tableUrl)
          const tableData = await tableResponse.json()

          if (
            tableData.code === 'Ok' &&
            Array.isArray(tableData.distances)
          ) {
            const bestOrder = findBestOrder(
              tableData.distances,
              found.length
            )

            orderedLocations = bestOrder.map(
              (index) => found[index]
            )

            optimized = true
          }
        } catch (error) {
          console.warn(
            'Road-distance comparison failed. Trying the entered order.',
            error
          )

          orderedLocations = found
        }

        if (cancelled) return

        setLocations(orderedLocations)

        stage = 'road-route calculation'
        setStatus(
          optimized
            ? 'Best stop order found. Calculating the road route...'
            : 'Optimization service unavailable. Trying the entered order...'
        )

        const orderedCoordinates = orderedLocations
          .map(
            (item) =>
              `${item.position[1]},${item.position[0]}`
          )
          .join(';')

        const routeUrl =
          `https://router.project-osrm.org/route/v1/driving/${orderedCoordinates}?overview=full&geometries=geojson`

        const response = await fetchWithRetry(routeUrl)
        const data = await response.json()

        if (data.code !== 'Ok' || !data.routes?.length) {
          throw new Error(
            data.message || 'No driving route was returned.'
          )
        }

        if (cancelled) return

        const roadDistanceKm = Number(
          (data.routes[0].distance / 1000).toFixed(1)
        )

        setRoadCoordinates(
          data.routes[0].geometry.coordinates.map(
            ([longitude, latitude]) => [
              latitude,
              longitude,
            ]
          )
        )

        setStatus(
          `${optimized ? 'Route optimized' : 'Road route calculated'} • ${roadDistanceKm.toFixed(1)} km`
        )

        if (typeof callbackRef.current === 'function') {
          callbackRef.current({
            route: orderedLocations.map((item) => item.name),
            distanceKm: roadDistanceKm,
            optimized,
          })
        }
      } catch (error) {
        if (!cancelled) {
          console.error(`MinuteX ${stage} error:`, error)

          setStatus(
            `${stage.charAt(0).toUpperCase() + stage.slice(1)} failed. ${error.message || 'Check your internet connection and try again.'}`
          )
        }
      }
    }

    findLocationsAndRoute()

    return () => {
      cancelled = true
    }
  }, [route])

  return (
    <div className="minutex-map">
      {status && (
        <p className="map-status" role="status">
          <span className="map-status-dot" />
          {status}
        </p>
      )}

      <div className="map-canvas">
        <MapContainer
          center={defaultCenter}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater locations={locations} />

          {locations.map((item, index) => (
            <Marker
              key={`${item.name}-${index}`}
              position={item.position}
            >
              <Popup>
                {index === 0
                  ? 'Starting Point'
                  : index === locations.length - 1
                    ? 'Final Destination'
                    : `Delivery Stop ${index}`}
                {`: ${item.name}`}
              </Popup>
            </Marker>
          ))}

          {roadCoordinates.length > 1 && (
            <Polyline
              positions={roadCoordinates}
              pathOptions={{
                color: '#6855e7',
                weight: 5,
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}

export default MapView
