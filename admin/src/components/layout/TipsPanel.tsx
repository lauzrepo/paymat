import { Lightbulb, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getTipsForPath } from '../../data/pageTips';

interface TipsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function TipsPanel({ open, onClose }: TipsPanelProps) {
  const { pathname } = useLocation();
  const { tips, pageName } = getTipsForPath(pathname);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Tips & Tricks panel"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Tips &amp; Tricks
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pageName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close tips panel"
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tip count */}
        <div className="px-4 pt-3 pb-1 flex-shrink-0">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {tips.length} tip{tips.length !== 1 ? 's' : ''} for this page
          </span>
        </div>

        {/* Tips list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 pt-2">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex-shrink-0 text-yellow-500 dark:text-yellow-400">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                    {tip.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                    {tip.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
