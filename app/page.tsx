'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('../components/MapView'), {
  ssr: false,
});

export default function Home() {
  const [geojson, setGeojson] = useState<any>(null);
  const [kecamatan, setKecamatan] = useState('');
  const [desa, setDesa] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/data/nabire_bangunan.geojson')
      .then((res) => res.json())
      .then(setGeojson);
  }, []);

  const features = geojson?.features || [];

  const kecamatanList = useMemo(() => {
    return [...new Set(features.map((f: any) => f.properties.nmkec).filter(Boolean))].sort();
  }, [features]);

  const desaList = useMemo(() => {
    return [
      ...new Set(
        features
          .filter((f: any) => !kecamatan || f.properties.nmkec === kecamatan)
          .map((f: any) => f.properties.nmdesa)
          .filter(Boolean)
      ),
    ].sort();
  }, [features, kecamatan]);

  const filteredFeatures = useMemo(() => {
    return features.filter((f: any) => {
      const p = f.properties;

      const matchKecamatan = !kecamatan || p.nmkec === kecamatan;
      const matchDesa = !desa || p.nmdesa === desa;
      const matchSearch =
        !search ||
        String(p.idsls || '').toLowerCase().includes(search.toLowerCase()) ||
        String(p.nmsls || '').toLowerCase().includes(search.toLowerCase());

      return matchKecamatan && matchDesa && matchSearch;
    });
  }, [features, kecamatan, desa, search]);

  const filteredGeojson = {
    type: 'FeatureCollection',
    features: filteredFeatures,
  };

  const totalBangunan = filteredFeatures.reduce(
    (sum: number, f: any) => sum + Number(f.properties.jumlah_bangunan_conf_05 || 0),
    0
  );

  const totalAll = filteredFeatures.reduce(
    (sum: number, f: any) => sum + Number(f.properties.jumlah_bangunan_all || 0),
    0
  );

  return (
    <main style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px', color: '#0f172a' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700 }}>
        Dashboard Estimasi Bangunan Kabupaten Nabire
      </h1>
      <p style={{ color: '#64748b', marginTop: '6px' }}>
        Visualisasi jumlah bangunan per SLS berdasarkan hasil Google Earth Engine.
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
        <Card title="Bangunan Conf > 0.5" value={totalBangunan.toLocaleString('id-ID')} />
        <Card title="Semua Deteksi" value={totalAll.toLocaleString('id-ID')} />
        <Card title="Jumlah SLS" value={filteredFeatures.length.toLocaleString('id-ID')} />
        <Card title="Jumlah Kecamatan" value={kecamatanList.length.toLocaleString('id-ID')} />
      </section>

      <section style={{ background: 'white', padding: '16px', borderRadius: '16px', marginTop: '20px', display: 'flex', gap: '12px' }}>
        <select
          value={kecamatan}
          onChange={(e) => {
            setKecamatan(e.target.value);
            setDesa('');
          }}
          style={inputStyle}
        >
          <option value="">Semua Kecamatan</option>
          {kecamatanList.map((item: any) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <select value={desa} onChange={(e) => setDesa(e.target.value)} style={inputStyle}>
          <option value="">Semua Desa/Kelurahan</option>
          {desaList.map((item: any) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <input
          placeholder="Cari IDSLS / nama SLS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
      </section>

      <section style={{ marginTop: '20px', background: 'white', padding: '16px', borderRadius: '16px' }}>
        <MapView data={filteredGeojson} />
      </section>

      <section style={{ marginTop: '20px', background: 'white', padding: '16px', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Tabel Detail SLS</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <Th>IDSLS</Th>
                <Th>Kecamatan</Th>
                <Th>Desa/Kelurahan</Th>
                <Th>Nama SLS</Th>
                <Th>Bangunan Conf &gt; 0.5</Th>
                <Th>Semua Deteksi</Th>
              </tr>
            </thead>
<tbody>
  {filteredFeatures.slice(0, 100).map((f: any, index: number) => {
    const p = f.properties;

    return (
      <tr
        key={`${p.idsls}-${index}`}
        style={{ borderBottom: '1px solid #e2e8f0' }}
      >
        <Td>{p.idsls}</Td>
        <Td>{p.nmkec}</Td>
        <Td>{p.nmdesa}</Td>
        <Td>{p.nmsls}</Td>
        <Td>{p.jumlah_bangunan_conf_05}</Td>
        <Td>{p.jumlah_bangunan_all}</Td>
      </tr>
    );
  })}
</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '16px' }}>
      <div style={{ color: '#64748b', fontSize: '14px' }}>{title}</div>
      <div style={{ fontSize: '30px', fontWeight: 700, marginTop: '8px' }}>{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '10px' }}>{children}</td>;
}

const inputStyle = {
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  minWidth: '220px',
};