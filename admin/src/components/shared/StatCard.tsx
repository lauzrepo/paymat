import { Card, CardBody } from '../ui/Card';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardBody>
    </Card>
  );
}
