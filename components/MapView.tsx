'use client';

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

type Props = {
  data: any;
};

export default function MapView({ data }: Props) {
  const center: LatLngExpression = [-3.36, 135.5];

  return (
    <div style={{ height: '560px', width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={9} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {data && (
          <GeoJSON
            key={JSON.stringify(data.features?.map((f: any) => f.properties?.idsls))}
            data={data}
            style={(feature: any) => {
              const val = feature?.properties?.jumlah_bangunan_conf_05 || 0;

              return {
                fillColor:
                  val > 150 ? '#dc2626' :
                  val > 100 ? '#f97316' :
                  val > 50 ? '#fde047' :
                  '#16a34a',
                weight: 1,
                color: '#ffffff',
                fillOpacity: 0.75,
              };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const p = feature.properties;

              layer.bindPopup(`
                <b>IDSLS:</b> ${p.idsls ?? '-'}<br/>
                <b>Kecamatan:</b> ${p.nmkec ?? '-'}<br/>
                <b>Desa/Kelurahan:</b> ${p.nmdesa ?? '-'}<br/>
                <b>Nama SLS:</b> ${p.nmsls ?? '-'}<br/>
                <b>Bangunan Conf > 0.5:</b> ${p.jumlah_bangunan_conf_05 ?? 0}<br/>
                <b>Semua Deteksi:</b> ${p.jumlah_bangunan_all ?? 0}
              `);
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}