import { INTO_HINT, INTO_TITLE } from '../lib/explore/intoPage';
import { openInto } from '../lib/intoNav';
import { PageRow } from './PageRow';

/**
 * What I'm into's one row (specs/what-im-into-page WI1, WI2, WI12-WI14; decision 0192), where its list was: in the ready
 * bar's settings with Explore chosen and in the walk's drawer with Explore on. Its words and a chevron, in ink, the
 * whole row one target; a tap pushes the page. It carries no count or summary of what is on (WI12). Back from the page
 * puts focus on it again (WI14), as `PageRow` does for every such row.
 */
export function IntoRow(props: { from?: 'walk' | 'ready' }) {
  return <PageRow testID="into-row" label={INTO_TITLE} hint={INTO_HINT} onOpen={() => openInto(props.from)} />;
}
