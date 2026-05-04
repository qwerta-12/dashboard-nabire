'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('../components/MapView'), {
  ssr: false,
});

type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [geojson, setGeojson] = useState<any>(null);
  const [kecamatan, setKecamatan] = useState('');
  const [desa, setDesa] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('jumlah_bangunan_conf_05');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const rowsPerPage = 25;

  useEffect(() => {
    fetch('/data/nabire_bangunan.geojson')
      .then((res) => res.json())
      .then(setGeojson);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [kecamatan, desa, search, sortField, sortDirection]);

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

  const sortedFeatures = useMemo(() => {
    return [...filteredFeatures].sort((a: any, b: any) => {
      const aValue = a.properties?.[sortField] ?? '';
      const bValue = b.properties?.[sortField] ?? '';

      const aNumber = Number(aValue);
      const bNumber = Number(bValue);
      const bothNumber = !Number.isNaN(aNumber) && !Number.isNaN(bNumber);

      if (bothNumber) {
        return sortDirection === 'asc' ? aNumber - bNumber : bNumber - aNumber;
      }

      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [filteredFeatures, sortField, sortDirection]);

  const filteredGeojson = {
    type: 'FeatureCollection',
    features: sortedFeatures,
  };

  const totalPages = Math.max(1, Math.ceil(sortedFeatures.length / rowsPerPage));

  const paginatedFeatures = sortedFeatures.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const totalBangunan = sortedFeatures.reduce(
    (sum: number, f: any) => sum + Number(f.properties.jumlah_bangunan_conf_05 || 0),
    0
  );

  const totalAll = sortedFeatures.reduce(
    (sum: number, f: any) => sum + Number(f.properties.jumlah_bangunan_all || 0),
    0
  );

  const totalDesa = new Set(sortedFeatures.map((f: any) => f.properties.nmdesa).filter(Boolean)).size;
  const totalKecamatan = new Set(sortedFeatures.map((f: any) => f.properties.nmkec).filter(Boolean)).size;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field.includes('jumlah') ? 'desc' : 'asc');
    }
  };

  const exportFilteredCSV = () => {
    const headers = [
      'idsls',
      'kecamatan',
      'desa_kelurahan',
      'nama_sls',
      'jumlah_bangunan_conf_05',
      'jumlah_bangunan_all',
    ];

    const rows = sortedFeatures.map((f: any) => {
      const p = f.properties;

      return [
        p.idsls ?? '',
        p.nmkec ?? '',
        p.nmdesa ?? '',
        p.nmsls ?? '',
        p.jumlah_bangunan_conf_05 ?? 0,
        p.jumlah_bangunan_all ?? 0,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'data_bangunan_nabire_filtered.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight md:text-3xl">
          Dashboard Estimasi Bangunan Kabupaten Nabire
        </h1>
        <p className="mt-2 text-sm text-slate-500 md:text-base">
          Visualisasi jumlah bangunan per SLS berdasarkan hasil Google Earth Engine.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Bangunan Conf > 0.5" value={totalBangunan.toLocaleString('id-ID')} />
        <Card title="Semua Deteksi" value={totalAll.toLocaleString('id-ID')} />
        <Card title="Jumlah SLS" value={sortedFeatures.length.toLocaleString('id-ID')} />
        <Card title="Kecamatan/Desa" value={`${totalKecamatan} / ${totalDesa}`} />
      </section>

      <section className="mt-5 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-3">
        <select
          value={kecamatan}
          onChange={(e) => {
            setKecamatan(e.target.value);
            setDesa('');
          }}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Semua Kecamatan</option>
          {kecamatanList.map((item: any) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <select
          value={desa}
          onChange={(e) => setDesa(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Semua Desa/Kelurahan</option>
          {desaList.map((item: any) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <input
          placeholder="Cari IDSLS / nama SLS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold">Peta SLS Nabire</h2>
            <span className="text-sm text-slate-500">
              {sortedFeatures.length.toLocaleString('id-ID')} SLS ditampilkan
            </span>
          </div>
          <MapView data={filteredGeojson} />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">Ringkasan Wilayah</h2>

          <div className="space-y-3">
            <InfoRow label="Filter Kecamatan" value={kecamatan || 'Semua'} />
            <InfoRow label="Filter Desa/Kelurahan" value={desa || 'Semua'} />
            <InfoRow label="Total SLS Terfilter" value={sortedFeatures.length.toLocaleString('id-ID')} />
            <InfoRow
              label="Rata-rata Bangunan/SLS"
              value={
                sortedFeatures.length
                  ? Math.round(totalBangunan / sortedFeatures.length).toLocaleString('id-ID')
                  : '0'
              }
            />
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Warna peta menunjukkan estimasi jumlah bangunan:
            <div className="mt-3 space-y-2">
              <Legend color="bg-green-600" label="0 - 50 bangunan" />
              <Legend color="bg-yellow-300" label="51 - 100 bangunan" />
              <Legend color="bg-orange-500" label="101 - 150 bangunan" />
              <Legend color="bg-red-600" label="> 150 bangunan" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Tabel Detail SLS</h2>
            <span className="text-sm text-slate-500">
              Halaman {page} dari {totalPages} • {sortedFeatures.length.toLocaleString('id-ID')} data
            </span>
          </div>

          <button
            onClick={exportFilteredCSV}
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 md:w-auto"
          >
            Export CSV Sesuai Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <SortableTh field="idsls" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                  IDSLS
                </SortableTh>
                <SortableTh field="nmkec" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                  Kecamatan
                </SortableTh>
                <SortableTh field="nmdesa" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                  Desa/Kelurahan
                </SortableTh>
                <SortableTh field="nmsls" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                  Nama SLS
                </SortableTh>
                <SortableTh field="jumlah_bangunan_conf_05" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                  Bangunan Conf &gt; 0.5
                </SortableTh>
                <SortableTh field="jumlah_bangunan_all" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                  Semua Deteksi
                </SortableTh>
              </tr>
            </thead>
            <tbody>
              {paginatedFeatures.map((f: any, index: number) => {
                const p = f.properties;

                return (
                  <tr key={`${p.idsls}-${page}-${index}`} className="border-b border-slate-200">
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

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
          >
            ‹
          </button>

          {getPageNumbers(page, totalPages).map((num, index) =>
            num === '...' ? (
              <span key={`dots-${index}`} className="px-2 text-slate-400">...</span>
            ) : (
              <button
                key={num}
                onClick={() => setPage(Number(num))}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  page === num
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {num}
              </button>
            )
          )}

          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </section>
    </main>
  );
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
  if (currentPage >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold md:text-3xl">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function SortableTh({
  children,
  field,
  sortField,
  sortDirection,
  onSort,
}: {
  children: React.ReactNode;
  field: string;
  sortField: string;
  sortDirection: SortDirection;
  onSort: (field: string) => void;
}) {
  const active = sortField === field;

  return (
    <th className="whitespace-nowrap px-3 py-3 font-semibold">
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-blue-600"
      >
        {children}
        <span className="text-xs">
          {active ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="whitespace-nowrap px-3 py-3">{children}</td>;
}