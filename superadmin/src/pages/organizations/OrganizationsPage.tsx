import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';

export function OrganizationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useOrganizations({ page, search: search || undefined });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Organizations</h1>
        <Button onClick={() => navigate('/organizations/new')}>
          <Plus className="h-4 w-4 mr-1" /> New Organization
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or slug…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">{data?.total ?? 0} organizations</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : !data?.organizations.length ? (
            <p className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No organizations found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Slug</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Contacts</th>
                  <th className="px-6 py-3 text-left">Users</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Mode</th>
                  <th className="px-6 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-3 font-medium">
                      <Link to={`/organizations/${org.id}`} className="text-violet-600 hover:underline">
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{org.slug}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300 capitalize">{org.type}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{org._count?.contacts ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{org._count?.users ?? '—'}</td>
                    <td className="px-6 py-3">
                      <Badge variant={org.isActive ? 'green' : 'red'}>
                        {org.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={org.sandboxMode !== false ? 'yellow' : 'blue'}>
                        {org.sandboxMode !== false ? 'Sandbox' : 'Production'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(org.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {data.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
