import { describe, expect, it } from 'vitest';
import { buildWorkflowFeedbackSummary } from '@/lib/workflow/feedback';

describe('workflow feedback summary', () => {
  it('prioritizes change-request feedback and marks the item as ready to resubmit', () => {
    const summary = buildWorkflowFeedbackSummary({
      contentLabel: 'Article',
      status: 'changes_requested',
      returnForChangesReason: 'Add sourcing for the second claim and tighten the headline.',
      copyEditorNotes: 'Trim the opening paragraph.',
      workflowComments: [{ body: 'Please revisit the sourcing before resubmitting.' }],
    });

    expect(summary.badge).toBe('Needs Changes');
    expect(summary.tone).toBe('danger');
    expect(summary.readyToResubmit).toBe(true);
    expect(summary.waitingOnDesk).toBe(false);
    expect(summary.highlightedNoteLabel).toBe('Desk feedback');
    expect(summary.highlightedNote).toContain('Add sourcing');
    expect(summary.nextAction).toContain('Submit For Review');
  });

  it('treats submitted content as waiting on the desk', () => {
    const summary = buildWorkflowFeedbackSummary({
      contentLabel: 'Story',
      status: 'submitted',
    });

    expect(summary.badge).toBe('Waiting On Desk');
    expect(summary.tone).toBe('warning');
    expect(summary.waitingOnDesk).toBe(true);
    expect(summary.readyToResubmit).toBe(false);
    expect(summary.summary).toContain('waiting for desk triage');
  });

  it('falls back to copy desk notes when no return-for-changes reason exists', () => {
    const summary = buildWorkflowFeedbackSummary({
      contentLabel: 'Story',
      status: 'copy_edit',
      copyEditorNotes: 'Double-check the location tag and sharpen the caption.',
      workflowComments: [{ body: 'Older workflow note that should not override copy desk notes.' }],
    });

    expect(summary.badge).toBe('Copy Desk');
    expect(summary.tone).toBe('info');
    expect(summary.highlightedNoteLabel).toBe('Copy desk note');
    expect(summary.highlightedNote).toContain('Double-check the location tag');
  });
});
