// The Report button and its form (FR-16), in the shiur's row of buttons.
//
//   guest:      the button goes to /sign-in, then back here (FR-1)
//   signed in:  it opens the three reasons, with a write-in for "Other"
//
// The form opens in a small window over the whole page (a portal into
// <body>), not inside the shiur popup. The popup lives inside Google's map
// marker, which takes the focus when its text box is clicked, so nothing
// could be typed there.
//
// After sending, every cached list and page is refreshed, so the "Reported"
// badge and the notice show straight away. Not shown for a cancelled date or
// one that's over (canReport in reports.format.ts).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import type { NewReport, ReportReason, ShiurDetails } from '@shiurfinder/shared';
import { messageFor } from '../../core/api';
import { useCurrentUser } from '../../core/auth';
import { sendReport } from './reports.api';
import { canReport, REASON_CHOICES } from './reports.format';

const BUTTON =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900';
const DONE =
  'rounded-md border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 dark:border-amber-800 dark:text-amber-300';

/** Matches MAX_DETAILS_LENGTH in server/src/features/reports/reports.constants.ts. */
const MAX_DETAILS_LENGTH = 300;

export function ReportButton({ details, now }: { details: ShiurDetails; now: number }) {
  const { user, isChecking } = useCurrentUser();
  const here = useRouterState({ select: (state) => state.location.href });
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  if (!canReport(details, now)) return null;
  // Nothing until we know, so a signed-in user doesn't get sent to sign in.
  if (isChecking) return null;

  if (!user) {
    return (
      <Link to="/sign-in" search={{ redirect: here }} title="Sign in to report" className={BUTTON}>
        Report
      </Link>
    );
  }

  if (sent) {
    return (
      <span role="status" className={DONE}>
        Reported, thanks
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((now) => !now)}
        aria-expanded={open}
        className={BUTTON}
      >
        Report
      </button>
      {open &&
        createPortal(
          <ReportForm
            occurrenceId={details.occurrenceId}
            title={details.title}
            onCancel={() => setOpen(false)}
            onSent={() => {
              setOpen(false);
              setSent(true);
            }}
          />,
          document.body,
        )}
    </>
  );
}

/** The three reasons and the write-in, in a window over the page. Escape or the backdrop closes it. */
function ReportForm({
  occurrenceId,
  title,
  onCancel,
  onSent,
}: {
  occurrenceId: string;
  title: string;
  onCancel: () => void;
  onSent: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  // Picking Other puts the cursor in its text box, ready to type.
  useEffect(() => {
    if (reason === 'OTHER') detailsRef.current?.focus();
  }, [reason]);

  const send = useMutation({
    mutationFn: (report: NewReport) => sendReport(occurrenceId, report),
    onSuccess: () => {
      // The notice, the shiur's status, the map's badges and the shul pages.
      void queryClient.invalidateQueries();
      onSent();
    },
  });

  const needsDetails = reason === 'OTHER' && details.trim() === '';

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason || needsDetails) return;
    send.mutate(reason === 'OTHER' ? { reason, details: details.trim() } : { reason });
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
      // A click on the dark backdrop (not inside the window) closes it.
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        // Stops here, so Escape closes only this window, not the shiur popup under it.
        event.stopPropagation();
        onCancel();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 text-sm text-slate-900 shadow-xl dark:bg-slate-950 dark:text-slate-100"
      >
        <div>
          <h2 id="report-title" className="text-base font-semibold">
            Report this date
          </h2>
          <p className="text-slate-500">{title}</p>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="mb-1 font-medium">Why isn’t this date happening?</legend>
          {REASON_CHOICES.map((choice) => (
            <label key={choice.reason} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="report-reason"
                value={choice.reason}
                checked={reason === choice.reason}
                onChange={() => setReason(choice.reason)}
              />
              {choice.label}
            </label>
          ))}
        </fieldset>

        {reason === 'OTHER' && (
          <textarea
            ref={detailsRef}
            rows={3}
            required
            maxLength={MAX_DETAILS_LENGTH}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="What’s going on?"
            aria-label="What’s going on?"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-400"
          />
        )}

        <p className="text-xs text-slate-500">
          Everyone will see it as an unverified report until it’s confirmed.
        </p>

        {send.error && <p className="text-red-600 dark:text-red-400">{messageFor(send.error)}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!reason || needsDetails || send.isPending}
            className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {send.isPending ? 'Sending…' : 'Send report'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
