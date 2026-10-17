import type { LedgerFeed } from '@activity/application/ports/activity-ledger-reader.port';

import type { ProjectActivitySourceLink } from '../domain/ports/project-activity-source.repository';
import type { Divergence } from '../domain/services/detect-divergences';
import type { CycleActivitySummary } from '../domain/services/summarize-cycle-activity';

/** Một nguồn của Project: feed như sổ thấy, cộng lúc gắn. */
export interface ActivitySourceView extends LedgerFeed {
  linkedAt: Date;
}

export interface CycleActivityView extends CycleActivitySummary {
  cycleId: string;
  cycleNumber: number;
  startedAt: Date;
}

export interface ProjectActivityView {
  projectId: string;
  timeZone: string;
  sources: ActivitySourceView[];
  currentCycle: CycleActivityView | null;
  divergences: Divergence[];
}

/** Ghép mối nối với feed, giữ thứ tự gắn. */
export function toSourceViews(
  links: readonly ProjectActivitySourceLink[],
  feeds: readonly LedgerFeed[],
): ActivitySourceView[] {
  const byId = new Map(feeds.map((feed) => [feed.feedId, feed]));
  return links.flatMap((link) => {
    const feed = byId.get(link.feedId);
    return feed ? [{ ...feed, linkedAt: link.linkedAt }] : [];
  });
}
