import { useState, useRef, useEffect, useCallback } from 'react';
// @ts-ignore
import Globe from 'react-globe.gl';
import { awsRegions, CONTINENTS, type AwsRegionData } from '../data/awsGlobeData';
import { Globe as GlobeIcon, MapPin } from 'lucide-react';

const GLOBE_IMAGE_URL = 'https://unpkg.com/three-globe/example/img/earth-day.jpg';
const GLOBE_TOPOLOGY_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png';

const COLOR = {
  available: '#3B82F6',
  upcoming: '#64748B',
  selected: '#A855F7',
};

const FIXED_ALTITUDE = 1.05;

interface Aws3DGlobeProps {
  selectedRegion: AwsRegionData | null;
  onRegionSelect: (region: AwsRegionData) => void;
}

export function Aws3DGlobe({ selectedRegion, onRegionSelect }: Aws3DGlobeProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeContinent, setActiveContinent] = useState(0);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setContainerWidth(Math.floor(w));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat: 39, lng: -98, altitude: FIXED_ALTITUDE }, 0);
        const controls = globeRef.current?.controls();
        if (controls) {
          controls.minDistance = 200;
          controls.maxDistance = 280;
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const focusOn = useCallback((lat: number, lng: number, altitude: number, ms = 800) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng, altitude }, ms);
    }
  }, []);

  const handleContinentClick = (index: number) => {
    setActiveContinent(index);
    const c = CONTINENTS[index];
    focusOn(c.lat, c.lng, FIXED_ALTITUDE);
  };

  const handleRegionSelect = (region: AwsRegionData) => {
    onRegionSelect(region);
    focusOn(region.lat, region.lng, FIXED_ALTITUDE, 800);
  };

  const filteredRegions = awsRegions.filter((r) => {
    if (activeContinent === 0) return true;
    return r.continent === CONTINENTS[activeContinent].label;
  });

  const pointsData = awsRegions.map((r) => ({
    ...r,
    pointColor: selectedRegion?.id === r.id ? COLOR.selected : r.status === 'available' ? COLOR.available : COLOR.upcoming,
    pointRadius: selectedRegion?.id === r.id ? 0.9 : 0.6,
  }));

  const ringsData = selectedRegion
    ? [{ lat: selectedRegion.lat, lng: selectedRegion.lng, color: COLOR.selected }]
    : [];

  const htmlElementsData = selectedRegion
    ? [{ lat: selectedRegion.lat, lng: selectedRegion.lng, name: selectedRegion.name, code: selectedRegion.code }]
    : [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 flex flex-col overflow-hidden relative z-0">
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">

        {/* Panel lateral izquierdo */}
        <div className="w-full lg:w-1/3 z-10 flex flex-col gap-4">
          {/* Pestanas de continentes */}
          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-3">
              <GlobeIcon size={16} className="text-primary dark:text-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vista Global</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CONTINENTS.map((c, i) => (
                <button
                  key={c.label}
                  onClick={() => handleContinentClick(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    activeContinent === i
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de regiones */}
          <div className="flex-1 min-h-0 max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 select-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Regiones AWS ({filteredRegions.length})</p>
              <div className="space-y-1">
                  {filteredRegions.map((r) => {
                    const isSelected = selectedRegion?.id === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleRegionSelect(r)}
                        className={`w-full text-left rounded-lg transition-all duration-150 ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-blue-600 text-white p-3 shadow-md'
                            : 'bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 p-2.5 border border-transparent dark:border-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border-2"
                            style={{
                              backgroundColor: isSelected ? COLOR.selected : r.status === 'available' ? COLOR.available : COLOR.upcoming,
                              borderColor: isSelected ? '#fff' : 'transparent',
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{r.name}</p>
                            <p className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>{r.code}</p>
                          </div>
                          <MapPin size={12} className={isSelected ? 'text-slate-400' : 'text-slate-300 dark:text-slate-600'} />
                        </div>
                        {isSelected && (
                          <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">Zonas de disponibilidad</span>
                              <span className="text-white font-medium">{r.azCount > 0 ? r.azCount : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">Lanzamiento</span>
                              <span className="text-white font-medium">{r.launchYear}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">Estado</span>
                              <span className={`font-medium ${r.status === 'available' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {r.status === 'available' ? 'Disponible' : 'Próximamente'}
                              </span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        {/* Globo 3D */}
        <div
          ref={containerRef}
          className="w-full lg:w-2/3 h-[500px] relative overflow-hidden [&>div>canvas]:!w-full [&>div>canvas]:!h-full bg-gradient-to-br from-slate-50 dark:from-slate-950 via-indigo-50/20 dark:via-indigo-500/10 to-blue-50/30 dark:to-blue-500/10 rounded-xl flex items-center justify-center"
        >
          <Globe
            ref={globeRef}
            width={containerWidth}
            height={500}
            globeImageUrl={GLOBE_IMAGE_URL}
            bumpImageUrl={GLOBE_TOPOLOGY_URL}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={true}
            atmosphereColor="#3B82F6"
            atmosphereAltitude={0.15}
            pointsData={pointsData}
            pointLat="lat"
            pointLng="lng"
            pointColor="pointColor"
            pointAltitude={0.03}
            pointRadius="pointRadius"
            pointLabel={(d: any) => `
              <div style="background:#ffffff;color:#1e293b;padding:10px 14px;border-radius:10px;font-size:12px;min-width:150px;box-shadow:0 4px 16px rgba(0,0,0,.12);border:1px solid #e2e8f0">
                <b>${d.name}</b><br/>
                <span style="color:#64748b">${d.code}</span>
              </div>
            `}
            onPointClick={(d: any) => handleRegionSelect(d)}
            ringsData={ringsData}
            ringLat="lat"
            ringLng="lng"
            ringColor="color"
            ringMaxRadius={3}
            ringPropagationSpeed={4}
            ringRepeatPeriod={1500}
            htmlElementsData={htmlElementsData}
            htmlLat="lat"
            htmlLng="lng"
            htmlElement={(d: any) => {
              const el = document.createElement('div');
              el.innerHTML = `
                <div class="relative bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-xl border border-slate-700 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-900">
                  AWS ${d.name} (${d.code})
                </div>
              `;
              el.style.cssText = 'transform: translate(-50%, -100%) translateY(-48px); pointer-events: none;';
              return el;
            }}
          />
          {/* Overlay de estado */}
          <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-slate-600 dark:text-slate-300 space-y-0.5 border border-slate-200 dark:border-slate-700 shadow-sm pointer-events-none">
            <p><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5 align-middle" /> Disponible</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1.5 align-middle" /> Próximamente</p>
            <p><span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1.5 align-middle" /> Seleccionada</p>
          </div>
        </div>

      </div>
    </div>
  );
}
