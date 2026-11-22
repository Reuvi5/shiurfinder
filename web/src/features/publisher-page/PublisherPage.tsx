// A shul's or maggid shiur's public page (FR-10). Placeholder for now.

import { useParams } from '@tanstack/react-router';

export function PublisherPage() {
  const { id } = useParams({ from: '/shul/$id' });

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Shul page</h1>
      <p className="text-slate-500">Coming soon. Publisher id: {id}</p>
    </main>
  );
}
