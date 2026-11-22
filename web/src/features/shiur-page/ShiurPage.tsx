// One date of a shiur: everything needed to decide whether to go (FR-9).
// Placeholder for now.

import { useParams } from '@tanstack/react-router';

export function ShiurPage() {
  const { id } = useParams({ from: '/shiur/$id' });

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Shiur</h1>
      <p className="text-slate-500">Coming soon. Occurrence id: {id}</p>
    </main>
  );
}
