import { Platform } from 'react-native';

/**
 * The journal's two voices (chronicle journal JN4, decision 0151): the owner's words in the platform's own
 * serif (no font is bundled), everything the app says in its sans.
 */
export const OWNER_FONT = Platform.select({ web: 'ui-serif, Georgia, serif', ios: 'Georgia', default: 'serif' });
