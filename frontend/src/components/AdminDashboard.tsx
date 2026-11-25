import { useState } from 'react';
import type { BusDataB2B } from '@costa-bus/shared';
import { useSocket } from '../hooks/useSocket';
import { AdminLogin } from './AdminLogin';

export function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const { buses, connected, authError } = useSocket<BusDataB2B>('B2B', token ?? undefined);

  if (!token || authError) {
    return <AdminLogin onLogin={setToken} error={authError} />;
  }

  const busesArray = Object.values(buses);
  const activeAlertsCount = busesArray.filter(
    (b) => b.alerta === 'DETENIDO' || b.estadoConexion === 'Sin conexion'
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0b1120', color: '#e2e8f0' }}>
      {/* HEADER INTEGRADO CON EL ESTILO DE COSTA BUS TRACKER */}
      <header style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: '#111827',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="mi" aria-hidden="true" style={{ color: '#38bdf8', fontSize: '1.35rem' }}>directions_bus</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>Costa Bus Tracker</span>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>Torre de Control Operativa</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {activeAlertsCount > 0 && (
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#f87171',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '0.25rem 0.65rem',
              borderRadius: '999px'
            }}>
              {activeAlertsCount} {activeAlertsCount === 1 ? 'incidencia' : 'incidencias'}
            </span>
          )}

          <span className={`status ${connected ? 'status--online' : 'status--offline'}`}>
            <span className="status__dot" />
            {connected ? 'En vivo' : 'Reconectando...'}
          </span>

          <button
            onClick={() => setToken(null)}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #334155',
              color: '#94a3b8',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ padding: '1.5rem', maxWidth: '1320px', width: '100%', margin: '0 auto', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>
            Unidades Monitoreadas ({busesArray.length})
          </h2>
        </div>

        {busesArray.length === 0 ? (
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '8px',
            padding: '2.5rem',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.9rem'
          }}>
            Esperando transmisión GPS de las unidades en ruta...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {busesArray.map((bus) => {
              const isDetenido = bus.alerta === 'DETENIDO';
              const isOffline = bus.estadoConexion === 'Sin conexion';
              const hasAlert = isDetenido || isOffline;
              const progressPct = Math.round((bus.progress ?? 0) * 100);
              const roundedEta = Math.max(1, Math.round(bus.etaMinutes));

              return (
                <article
                  key={bus.busId}
                  style={{
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    border: hasAlert ? '1px solid #dc2626' : '1px solid #1f2937'
                  }}
                >
                  {/* CABECERA DE TARJETA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{bus.busId}</h3>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginTop: '0.2rem' }}>
                        {bus.operator} • Placa {bus.placa}
                      </span>
                    </div>

                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      backgroundColor: hasAlert ? 'rgba(220, 38, 38, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: hasAlert ? '#f87171' : '#34d399',
                      border: hasAlert ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      {isOffline ? 'SIN CONEXIÓN' : isDetenido ? 'DETENIDO' : 'EN RUTA'}
                    </span>
                  </div>

                  {/* DATOS OPERATIVOS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Operador asignado</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{bus.chofer}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Próxima parada</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{bus.nextStopName} ({roundedEta} min)</span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Corredor activo</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{bus.origen} → {bus.destino}</span>
                    </div>
                  </div>

                  {/* BARRA DE PROGRESO */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                      <span>Velocidad: <strong style={{ color: '#f8fafc' }}>{bus.speedKmh} km/h</strong></span>
                      <span>{progressPct}% del recorrido</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#1f2937', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        backgroundColor: hasAlert ? '#ef4444' : '#0284c7',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* TELEMETRÍA HARDWARE ESP32 */}
                  <div style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #1f2937',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem',
                    color: '#94a3b8'
                  }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span title="Altitud sobre el nivel del mar">
                        <span className="mi" style={{ fontSize: '0.95rem', verticalAlign: 'text-bottom', marginRight: '3px', color: '#38bdf8' }}>terrain</span>
                        {bus.altitude_m !== undefined ? `${bus.altitude_m.toFixed(1)} m` : '--'}
                      </span>
                      <span title="Satélites GPS enganchados">
                        <span className="mi" style={{ fontSize: '0.95rem', verticalAlign: 'text-bottom', marginRight: '3px', color: '#38bdf8' }}>satellite_alt</span>
                        {bus.satellites ?? 0} sat
                      </span>
                      <span title="Coordenadas actuales">
                        <span className="mi" style={{ fontSize: '0.95rem', verticalAlign: 'text-bottom', marginRight: '3px', color: '#38bdf8' }}>pin_drop</span>
                        {bus.lat.toFixed(4)}, {bus.lng.toFixed(4)}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {new Date(bus.lastPing).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}