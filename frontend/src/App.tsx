import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plane, AlertTriangle, Activity } from 'lucide-react';

// Create a custom plane icon using SVG
const planeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" stroke="none">
  <path d="M17.8 19.2L16 11l4-4c.8-.8.8-2.2 0-3s-2.2-.8-3 0l-4 4-8.2-1.8c-.8-.2-1.5.4-1.5 1.2v.6c0 .5.3.9.7 1l5.3 1.5-2.5 2.5-2.7-.7c-.4-.1-.8.1-1 .4l-.4.4c-.2.2-.2.5 0 .7l2.8 1.4 1.4 2.8c.2.2.5.2.7 0l.4-.4c.3-.2.5-.6.4-1l-.7-2.7 2.5-2.5 1.5 5.3c.1.4.5.7 1 .7h.6c.8 0 1.4-.7 1.2-1.5z"/>
</svg>`;

const planeIcon = L.divIcon({
  html: `<div style="transform: rotate(45deg); width: 24px; height: 24px;">${planeSvg}</div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const emergencyIcon = L.divIcon({
  html: `<div style="transform: rotate(45deg); width: 24px; height: 24px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" stroke="none"><path d="M17.8 19.2L16 11l4-4c.8-.8.8-2.2 0-3s-2.2-.8-3 0l-4 4-8.2-1.8c-.8-.2-1.5.4-1.5 1.2v.6c0 .5.3.9.7 1l5.3 1.5-2.5 2.5-2.7-.7c-.4-.1-.8.1-1 .4l-.4.4c-.2.2-.2.5 0 .7l2.8 1.4 1.4 2.8c.2.2.5.2.7 0l.4-.4c.3-.2.5-.6.4-1l-.7-2.7 2.5-2.5 1.5 5.3c.1.4.5.7 1 .7h.6c.8 0 1.4-.7 1.2-1.5z"/></svg></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface Flight {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude: number;
  velocity: number;
  true_track: number;
  squawk: string;
}

interface FlightData {
  total_flights: number;
  emergencies: Flight[];
  flights: Flight[];
}

function App() {
  const [data, setData] = useState<FlightData>({ total_flights: 0, emergencies: [], flights: [] });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Use wss:// for HTTPS (Coolify), ws:// for local HTTP
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running on dev server (5173), hardcode 9876. If on Coolify, use current host.
    const wsHost = window.location.port === '5173' ? `${window.location.hostname}:9876/ws` : `${window.location.host}/ws`;
    const ws = new WebSocket(`${protocol}//${wsHost}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setData(payload);
      } catch (err) {
        console.error("Error parsing WS message", err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* Map Background */}
      <MapContainer 
        center={[39.8283, -98.5795]} 
        zoom={4} 
        style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {data.flights.map((flight) => {
          const isEmergency = ["7700", "7600", "7500"].includes(flight.squawk);
          
          return (
            <Marker 
              key={flight.icao24} 
              position={[flight.latitude, flight.longitude]}
              icon={isEmergency ? emergencyIcon : planeIcon}
              // We rotate the icon via a ref or custom logic in a full app, but for now we rely on default rendering
            >
              <Popup className="text-slate-900">
                <div className="p-1">
                  <h3 className="font-bold text-lg mb-1">{flight.callsign}</h3>
                  <p className="text-sm">Country: {flight.origin_country}</p>
                  <p className="text-sm">Altitude: {flight.altitude}m</p>
                  <p className="text-sm">Speed: {Math.round(flight.velocity * 3.6)} km/h</p>
                  <p className="text-sm">Squawk: {flight.squawk}</p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Dashboard Overlay */}
      <div className="absolute top-0 left-0 p-6 z-10 w-full max-w-md pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Global Air Traffic
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              <Activity size={14} className={connected ? "animate-pulse" : ""} />
              {connected ? "LIVE" : "DISCONNECTED"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex flex-col items-center justify-center">
              <Plane size={24} className="text-blue-400 mb-2" />
              <p className="text-3xl font-black">{data.total_flights}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Airborne (US)</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
              {data.emergencies.length > 0 && (
                <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
              )}
              <AlertTriangle size={24} className={data.emergencies.length > 0 ? "text-red-500" : "text-slate-500"} />
              <p className={`text-3xl font-black ${data.emergencies.length > 0 ? 'text-red-400' : ''}`}>
                {data.emergencies.length}
              </p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Emergencies</p>
            </div>
          </div>
          
          {data.emergencies.length > 0 && (
             <div className="mt-4 bg-red-950/50 border border-red-500/30 rounded-xl p-3 max-h-32 overflow-y-auto">
               <h3 className="text-red-400 text-xs font-bold uppercase mb-2">Active Squawks</h3>
               {data.emergencies.map(e => (
                 <div key={e.icao24} className="text-sm flex justify-between border-b border-red-900/30 pb-1 mb-1 last:border-0">
                   <span className="font-mono">{e.callsign}</span>
                   <span className="text-red-300 font-bold">{e.squawk}</span>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
