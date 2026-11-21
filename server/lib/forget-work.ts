import type { SupabaseClient } from '@supabase/supabase-js';
import { compactPortfolio, expandPortfolio, type PortfolioContent } from '../../shared/portfolio.js';

/**
 * What a work leaves behind that the database does not remove by itself, done just before
 * the work goes. Likes, saves and reports go with it in the database (and the like
 * counters follow); here: every notice about it, and its place in the artist's portfolio.
 */
export async function forgetWork(admin: SupabaseClient, workId: string, userId: string): Promise<void> {
  // Approved, held, liked, milestone…: none of them means anything once the work is gone.
  const { error: noticeError } = await admin.from('notifications').delete().eq('work_id', workId);
  if (noticeError) console.warn('[FORGET-WORK] Notices:', noticeError.message);

  try {
    await dropFromPortfolio(admin, workId, userId);
  } catch (error: any) {
    console.warn('[FORGET-WORK] Portfolio:', error?.message || error);
  }
}

/** The portfolio without that work: not as its cover, not in any list of works. */
export function withoutWork(content: PortfolioContent, workId: string): PortfolioContent {
  return {
    ...content,
    info: { ...content.info, heroWork: content.info.heroWork === workId ? null : content.info.heroWork },
    sections: content.sections.map((section) => (
      section.type === 'works' ? { ...section, items: section.items.filter((item) => item.id !== workId) } : section
    )),
  };
}

const mentions = (raw: unknown, workId: string) => JSON.stringify(raw ?? null).includes(workId);

async function dropFromPortfolio(admin: SupabaseClient, workId: string, userId: string) {
  const { data: row, error } = await admin
    .from('portfolios')
    .select('content, public_content, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!row || (!mentions(row.content, workId) && !mentions(row.public_content, workId))) return;

  const isSame = row.public_content && typeof row.public_content === 'object' && (row.public_content as { same?: boolean }).same === true;
  const content = compactPortfolio(withoutWork(expandPortfolio(row.content), workId));
  const shown = isSame || !row.public_content
    ? row.public_content
    : compactPortfolio(withoutWork(expandPortfolio(row.public_content), workId));

  // Only if nobody saved in between; a newer save is cleaned the next time, or by the artist.
  const { error: saveError } = await admin
    .from('portfolios')
    .update({ content, public_content: shown })
    .eq('user_id', userId)
    .eq('updated_at', row.updated_at);
  if (saveError) throw saveError;
}
