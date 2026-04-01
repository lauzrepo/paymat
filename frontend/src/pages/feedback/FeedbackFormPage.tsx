import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useSubmitFeedback } from '../../hooks/useFeedback';
import { useMe } from '../../hooks/useAuth';
import { useOrgSlug } from '../../context/OrgSlugContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import type { FeedbackType } from '../../api/feedback';

const EMPTY_FORM = { type: 'feedback' as FeedbackType, subject: '', message: '' };

export function FeedbackFormPage() {
  const { data: user } = useMe();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const submit = useSubmitFeedback();
  const orgSlug = useOrgSlug();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit.mutateAsync({
      name: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Member',
      email: user?.email,
      ...form,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Link to={`/${orgSlug}/feedback`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Feedback & Issues</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900">Thanks for reaching out!</h2>
          <p className="text-sm text-gray-500">We've received your submission and will follow up shortly.</p>
          <button
            onClick={() => { setForm(EMPTY_FORM); setSubmitted(false); }}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/${orgSlug}/feedback`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Feedback & Issues</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {submit.isError && (
            <Alert variant="error">Something went wrong. Please try again.</Alert>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as FeedbackType })}
              className="appearance-none bg-white w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="feedback">General Feedback</option>
              <option value="bug">Report a Problem</option>
              <option value="question">Question</option>
            </select>
          </div>

          <Input
            label="Subject"
            id="subject"
            placeholder="Brief description"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              required
              placeholder="Describe your feedback or issue in detail…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <Button type="submit" className="w-full" loading={submit.isPending}>
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
}
