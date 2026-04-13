import type { WorkflowStatus } from '@/lib/workflow/types';

export type WorkflowFeedbackTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

export type WorkflowFeedbackComment = {
  body?: string | null;
  kind?: string | null;
  author?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

export type WorkflowFeedbackSummary = {
  badge: string;
  tone: WorkflowFeedbackTone;
  summary: string;
  nextAction: string;
  highlightedNote?: string;
  highlightedNoteLabel?: string;
  highlightedBy?: string;
  readyToResubmit: boolean;
  waitingOnDesk: boolean;
};

type WorkflowFeedbackInput = {
  contentLabel: string;
  status: WorkflowStatus;
  assignedToName?: string | null;
  reviewedByName?: string | null;
  rejectionReason?: string | null;
  returnForChangesReason?: string | null;
  copyEditorNotes?: string | null;
  workflowComments?: WorkflowFeedbackComment[] | null;
};

function trimValue(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function getLatestComment(
  comments: WorkflowFeedbackComment[] | null | undefined
): WorkflowFeedbackComment | null {
  if (!Array.isArray(comments)) {
    return null;
  }

  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    if (trimValue(comment?.body)) {
      return comment;
    }
  }

  return null;
}

function getCommentAuthorLabel(comment: WorkflowFeedbackComment | null) {
  if (!comment?.author) {
    return '';
  }

  return trimValue(comment.author.name) || trimValue(comment.author.email);
}

function getHighlightedNote(input: WorkflowFeedbackInput) {
  const returnForChangesReason = trimValue(input.returnForChangesReason);
  if (returnForChangesReason) {
    return {
      label: 'Desk feedback',
      body: returnForChangesReason,
      by: trimValue(input.reviewedByName),
    };
  }

  const rejectionReason = trimValue(input.rejectionReason);
  if (rejectionReason) {
    return {
      label: 'Rejection reason',
      body: rejectionReason,
      by: trimValue(input.reviewedByName),
    };
  }

  const copyEditorNotes = trimValue(input.copyEditorNotes);
  if (copyEditorNotes) {
    return {
      label: 'Copy desk note',
      body: copyEditorNotes,
      by: trimValue(input.reviewedByName),
    };
  }

  const latestComment = getLatestComment(input.workflowComments);
  if (!latestComment) {
    return null;
  }

  const kind = trimValue(latestComment.kind);
  const label =
    kind === 'revision_request'
      ? 'Revision request'
      : kind === 'approval_note'
        ? 'Approval note'
        : kind === 'rejection_note'
          ? 'Rejection note'
          : 'Latest workflow note';

  return {
    label,
    body: trimValue(latestComment.body),
    by: getCommentAuthorLabel(latestComment),
  };
}

export function buildWorkflowFeedbackSummary(
  input: WorkflowFeedbackInput
): WorkflowFeedbackSummary {
  const contentLabel = trimValue(input.contentLabel) || 'Item';
  const lowerContentLabel = contentLabel.toLowerCase();
  const highlightedNote = getHighlightedNote(input);
  const assignedToName = trimValue(input.assignedToName);

  switch (input.status) {
    case 'draft':
      return {
        badge: 'Draft In Progress',
        tone: 'neutral',
        summary: `This ${lowerContentLabel} is still in draft and has not entered the desk workflow yet.`,
        nextAction: `Finish the edit, then use Submit For Review when the ${lowerContentLabel} is ready for desk review.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: false,
      };
    case 'submitted':
      return {
        badge: 'Waiting On Desk',
        tone: 'warning',
        summary: `This ${lowerContentLabel} has been submitted and is waiting for desk triage or assignment.`,
        nextAction: `No reporter action is needed right now unless the desk asks for more reporting or changes.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: true,
      };
    case 'assigned':
      return {
        badge: 'Assigned',
        tone: 'info',
        summary: assignedToName
          ? `This ${lowerContentLabel} is currently assigned to ${assignedToName}.`
          : `This ${lowerContentLabel} is assigned and moving through the desk.`,
        nextAction: `Watch for workflow notes and update the ${lowerContentLabel} if the desk sends it back for changes.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: true,
      };
    case 'in_review':
      return {
        badge: 'In Review',
        tone: 'info',
        summary: `The desk is actively reviewing this ${lowerContentLabel}.`,
        nextAction: `Hold for feedback unless a reviewer asks for an update or a clarification.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: true,
      };
    case 'copy_edit':
      return {
        badge: 'Copy Desk',
        tone: 'info',
        summary: `This ${lowerContentLabel} is in copy edit for polish, fact checks, and packaging.`,
        nextAction: `Wait for copy-desk notes. If changes are requested, update the ${lowerContentLabel} and resubmit it.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: true,
      };
    case 'changes_requested':
      return {
        badge: 'Needs Changes',
        tone: 'danger',
        summary: `The desk has requested revisions before this ${lowerContentLabel} can continue through workflow.`,
        nextAction: `Address the feedback, save your edits, then use Submit For Review to send the ${lowerContentLabel} back to the desk.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label || 'Desk feedback',
        highlightedBy: highlightedNote?.by,
        readyToResubmit: true,
        waitingOnDesk: false,
      };
    case 'ready_for_approval':
      return {
        badge: 'Ready For Approval',
        tone: 'success',
        summary: `Desk review is complete and this ${lowerContentLabel} is waiting for admin approval.`,
        nextAction: `No reporter action is needed unless the desk reopens the ${lowerContentLabel} for another pass.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: true,
      };
    case 'approved':
      return {
        badge: 'Approved',
        tone: 'success',
        summary: `This ${lowerContentLabel} is approved and waiting for publish handling.`,
        nextAction: `No reporter action is needed right now unless timing or packaging changes.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: true,
      };
    case 'scheduled':
      return {
        badge: 'Scheduled',
        tone: 'success',
        summary: `This ${lowerContentLabel} is scheduled for publish.`,
        nextAction: `No reporter action is needed unless the desk asks for a timing or content update.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: true,
      };
    case 'published':
      return {
        badge: 'Published',
        tone: 'success',
        summary: `This ${lowerContentLabel} is live.`,
        nextAction: `Monitor the published output and reopen it only if a correction or follow-up update is needed.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: false,
      };
    case 'rejected':
      return {
        badge: 'Rejected',
        tone: 'danger',
        summary: `This ${lowerContentLabel} was rejected and needs desk-requested fixes before it can re-enter workflow.`,
        nextAction: `Review the rejection reason, update the ${lowerContentLabel}, then resubmit it when the feedback is fully addressed.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label || 'Rejection reason',
        highlightedBy: highlightedNote?.by,
        readyToResubmit: true,
        waitingOnDesk: false,
      };
    case 'archived':
      return {
        badge: 'Archived',
        tone: 'neutral',
        summary: `This ${lowerContentLabel} is archived and no longer moving through the active desk workflow.`,
        nextAction: `Ask the desk to reopen it if work needs to resume.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: false,
      };
    default:
      return {
        badge: 'Workflow Update',
        tone: 'neutral',
        summary: `This ${lowerContentLabel} has workflow activity.`,
        nextAction: `Check the latest workflow note and current status before making the next update.`,
        highlightedNote: highlightedNote?.body,
        highlightedNoteLabel: highlightedNote?.label,
        highlightedBy: highlightedNote?.by,
        readyToResubmit: false,
        waitingOnDesk: false,
      };
  }
}
