import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  type Route,
  type City,
  type BusDataB2C,
  invertRoute,
  isReturnRoute,
  projectUserOnRoute,
  distanceKm,
} from "@costa-bus/shared";
import { useSocket, ALERT_ETA_THRESHOLD_MINUTES } from "./hooks/useSocket";
import { useAlarmSound } from "./hooks/useAlarmSound";
import { useGeolocation } from "./hooks/useGeolocation";
import { useTheme } from "./hooks/useTheme";
import { MapView } from "./components/MapView";
import { BusList } from "./components/BusList";
import { PurchaseLinks } from "./components/PurchaseLinks";
import { GoModePanel } from "./components/GoModePanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { NearbyRoutes, badgeForRoute, type NearbyRouteGroup } from "./components/NearbyRoutes";
import { ServiceAlerts } from "./components/ServiceAlerts";

const RETURN_COLORS: Record<string, string> = {
  "gdl-barra-navidad": "#60a5fa",
  "gdl-manzanillo": "#c084fc",
  "manzanillo-barra-navidad": "#fcd34d",
  "barra-navidad-puerto-vallarta": "#6ee7b7",
};

const NEARBY_MAX_KM = 40;
const NEARBY_MAX_RESULTS = 8;

function returnColorFor(route: Route): string {
  return RETURN_COLORS[route?.id] ?? route?.color ?? "#999999";
}

export function App() {
  const { socket, buses } = useSocket("B2C");

  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!socket) return;
    setConnected(socket.connected);
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);

  const offline = !connected;
  
  const routes: Route[] = []; 
  const alerts: any[] = [];
  const clearAlerts = () => {};

  const { unlock, playArrivalAlert, playUrgentAlert } = useAlarmSound();
  const { toggleTheme, isDark } = useTheme();
  const { location, loading: locating, error: locationError, request: requestLocation } = useGeolocation();

  const [selectedDirectionId, setSelectedDirectionId] = useState<string>("");
  const [followedBusId, setFollowedBusId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ringing, setRinging] = useState(false);

  const lastRungRef = useRef<{ busId: string; stopIndex: number } | null>(null);

  const busesArray = useMemo(() => Object.values(buses), [buses]);

  const routeDirections = useMemo<Route[]>(() => {
    return (routes || []).flatMap((route) => {
      if (!route) return [];
      return [route, invertRoute(route, returnColorFor(route))];
    });
  }, [routes]);

  useEffect(() => {
    if (selectedDirectionId || routeDirections.length === 0) return;
    setSelectedDirectionId(routeDirections[0]?.id ?? "");
  }, [routeDirections, selectedDirectionId]);

  const selectedRoute = useMemo(
    () => routeDirections.find((route) => route.id === selectedDirectionId) ?? null,
    [routeDirections, selectedDirectionId]
  );

  const userProjection = useMemo(() => {
    if (!location || !selectedRoute || !selectedRoute.cities || selectedRoute.cities.length < 2) return null;
    return projectUserOnRoute(selectedRoute, location.lat, location.lng);
  }, [location, selectedRoute]);

  const routeBuses = useMemo(() => {
    if (!selectedDirectionId) return busesArray;
    return busesArray.filter((bus: any) => !bus.routeId || bus.routeId === selectedDirectionId);
  }, [busesArray, selectedDirectionId]);

  const followedBus = useMemo(
    () => busesArray.find((bus) => bus.busId === followedBusId) ?? null,
    [busesArray, followedBusId]
  );

  const nearbyRoutes = useMemo<NearbyRouteGroup[]>(() => {
    if (!location) return [];
    const groups: NearbyRouteGroup[] = [];

    for (const route of routeDirections) {
      const cities = route.cities ?? [];
      if (cities.length === 0) continue;

      let best: { city: City; index: number; km: number } | null = null;

      for (let index = 0; index < cities.length; index++) {
        const city = cities[index];
        const km = distanceKm(location.lat, location.lng, city.lat, city.lng);
        if (!best || km < best.km) {
          best = { city, index, km };
        }
      }

      if (!best || best.km > NEARBY_MAX_KM) continue;

      groups.push({
        directionId: route.id,
        stopName: best.city.name,
        color: route.color ?? "#38bdf8",
        badge: badgeForRoute(route.id),
        title: route.name ?? "Ruta",
        subtitle: `Hacia ${best.city.name}`,
        distanceKm: best.km,
        operator: route.operators?.[0]?.name ?? "Operador",
        etaMinutes: null,
      });
    }

    return groups.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, NEARBY_MAX_RESULTS);
  }, [location, routeDirections]);

  const handleFollow = useCallback((bus: BusDataB2C) => {
    void unlock();
    setFollowedBusId((current) => {
      if (current === bus.busId) {
        setRinging(false);
        return null;
      }
      lastRungRef.current = null;
      return bus.busId;
    });
  }, [unlock]);

  const handleStopFollow = useCallback(() => {
    setFollowedBusId(null);
    setRinging(false);
    lastRungRef.current = null;
  }, []);

  const handleToggleSound = useCallback(() => {
    void unlock();
    setSoundEnabled((value) => !value);
  }, [unlock]);

  useEffect(() => {
    if (!followedBus) {
      setRinging(false);
      return;
    }
    
    const etaMinutes = followedBus.etaMinutes ?? Infinity;
    const withinThreshold = etaMinutes <= ALERT_ETA_THRESHOLD_MINUTES;

    if (!withinThreshold) {
      setRinging(false);
      return;
    }

    const alreadyRung = lastRungRef.current?.busId === followedBus.busId;
    setRinging(true);

    if (alreadyRung) return;
    lastRungRef.current = { busId: followedBus.busId, stopIndex: 0 };

    if (!soundEnabled) return;
    playArrivalAlert();
    if (etaMinutes <= 2) playUrgentAlert();
  }, [followedBus, soundEnabled, playArrivalAlert, playUrgentAlert]);

  const soonCount = useMemo(
    () => routeBuses.filter((bus: any) => (bus.etaMinutes ?? Infinity) <= ALERT_ETA_THRESHOLD_MINUTES).length,
    [routeBuses]
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <h1 className="app-header__title">
            <span className="mi" aria-hidden="true">directions_bus</span> Costa Bus Tracker
          </h1>
          <span className="app-header__subtitle">Costa de Jalisco · En Vivo</span>
        </div>
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        <div className="app-header__spacer" />
        {soonCount > 0 && (
          <span className="status" title="Autobuses a ≤ 5 minutos">
            <span className="mi" aria-hidden="true">timer</span> {soonCount} por llegar
          </span>
        )}
        <span className={`status ${connected ? "status--online" : "status--offline"}`}>
          <span className="status__dot" />
          {connected ? "En vivo" : offline ? "Sin conexión" : "Conectando…"}
        </span>
      </header>

      <div className="app-body">
        <MapView
          routes={routeDirections}
          buses={busesArray}
          selectedRouteId={selectedDirectionId}
          followBusId={followedBusId}
          userLocation={location}
          userPoint={userProjection?.point ?? null}
        />
        <GoModePanel
          bus={followedBus as any}
          ringing={ringing}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onStop={handleStopFollow}
        />

        <aside className="sidebar">
          {location ? (
            <div className="location-banner location-banner--ok">
              <span className="mi" aria-hidden="true">my_location</span>
              <div>
                <strong>Usando tu ubicación</strong>
                <div className="location-banner__hint">
                  {userProjection
                    ? `Las ETAs se calculan hasta ${userProjection.nextStopName}.`
                    : "No estás cerca del corredor de esta ruta."}
                </div>
              </div>
            </div>
          ) : (
            <div className="location-banner">
              <span className="mi" aria-hidden="true">location_on</span>
              <div style={{ flex: 1 }}>
                <strong>Usar mi ubicación</strong>
                <div className="location-banner__hint">Actívala para ver las rutas y los autobuses cerca de ti.</div>
                {locationError && <div className="location-banner__hint location-banner__hint--error">{locationError}</div>}
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ marginTop: 8 }}
                  disabled={locating}
                  onClick={requestLocation}
                >
                  <span className="mi" aria-hidden="true">my_location</span> {locating ? "Obteniendo…" : "Usar mi ubicación"}
                </button>
              </div>
            </div>
          )}

          {location && (
            <NearbyRoutes
              groups={nearbyRoutes}
              loading={locating}
              selectedDirectionId={selectedDirectionId}
              onSelect={setSelectedDirectionId}
            />
          )}

          <section>
            <h2 className="sidebar__section-title">
              <span><span className="mi" aria-hidden="true">map</span> Seleccionar Ruta</span>
            </h2>
            <div className="route-controls">
              <select
                className="route-select"
                value={selectedDirectionId}
                onChange={(e) => setSelectedDirectionId(e.target.value)}
              >
                <optgroup label="Ida">
                  {routeDirections.filter((r) => !isReturnRoute(r)).map((route) => (
                    <option key={route.id} value={route.id}>{route.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Regreso">
                  {routeDirections.filter((r) => isReturnRoute(r)).map((route) => (
                    <option key={route.id} value={route.id}>{route.name}</option>
                  ))}
                </optgroup>
              </select>
              <button
                type="button"
                className={`btn ${isReturnRoute(selectedRoute ?? routeDirections[0] ?? ({ id: "" } as Route)) ? "btn--primary" : ""}`}
                disabled={!selectedRoute}
                onClick={() => {
                  if (!selectedRoute) return;
                  const baseId = selectedRoute.id.replace(/-return$/, "");
                  const target = isReturnRoute(selectedRoute) ? baseId : `${selectedRoute.id}-return`;
                  const exists = routeDirections.some((r) => r.id === target);
                  if (exists) setSelectedDirectionId(target);
                }}
                title="Cambiar al sentido de regreso de esta ruta"
              >
                <span className="mi" aria-hidden="true">swap_horiz</span>{" "}
                {selectedRoute && isReturnRoute(selectedRoute) ? "Ver sentido de ida" : "Ver sentido de regreso"}
              </button>
            </div>
            {selectedRoute && (
              <div className="route-meta">
                <span className="chip">
                  <span className="chip__swatch" style={{ background: selectedRoute.color ?? "#999" }} />
                  {selectedRoute.cities?.length ?? 0} paradas
                </span>
                <span className="chip">
                  <span className="mi" aria-hidden="true">directions_bus</span> {routeBuses.length} unidades
                </span>
                <span className="chip">
                  <span className="mi" aria-hidden="true">corporate_fare</span> {selectedRoute.operators?.length ?? 0} operadores
                </span>
              </div>
            )}
          </section>

          <section>
            <h2 className="sidebar__section-title">
              <span><span className="mi" aria-hidden="true">directions_bus</span> Unidades Activas</span>
              <span>{routeBuses.length}</span>
            </h2>
            <BusList
              buses={routeBuses as any}
              followedBusId={followedBusId}
              onFollow={handleFollow as any}
              etaToUserByBus={{}}
              userStopName={userProjection?.nextStopName ?? null}
            />
          </section>

          <ServiceAlerts
            alerts={alerts}
            userStopName={userProjection?.nextStopName ?? null}
            nearestEtaMinutes={null}
            nearestOperator={null}
            onClear={clearAlerts}
          />

          <PurchaseLinks operators={selectedRoute?.operators ?? []} routeName={selectedRoute?.name ?? ""} />
        </aside>
      </div>
    </div>
  );
}