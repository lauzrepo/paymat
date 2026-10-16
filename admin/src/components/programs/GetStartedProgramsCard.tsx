import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useCurrentUser } from '../../hooks/useAuth';
import { usePrograms } from '../../hooks/usePrograms';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { TemplatePickerModal } from './TemplatePickerModal';

/**
 * Shown to admins until the org has at least one program, offering starter templates.
 * `onScratch` lets a page open its own "add program" form instead of navigating.
 */
export function GetStartedProgramsCard({ onScratch }: { onScratch?: () => void }) {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const programs = usePrograms({ page: 1 });
  const [open, setOpen] = useState(false);

  if (user?.role !== 'admin' || programs.isLoading || programs.isError || (programs.data?.total ?? 0) > 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardBody className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Sparkles className="h-5 w-5 mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Set up your programs</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Start from a template for your type of business and adjust the prices, or add programs one at a time.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setOpen(true)}>Start from a template</Button>
            <Button variant="secondary" onClick={onScratch ?? (() => navigate('/programs'))}>Add my own</Button>
          </div>
        </CardBody>
      </Card>
      <TemplatePickerModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
