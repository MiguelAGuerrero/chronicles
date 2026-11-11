import { StyleSheet } from 'react-native';
import { theme } from './ui';

/** The round button in the map's edge column and the card that opens beside it, shared by Layers and What I'm into (ML3, ES3). */
export const BUTTON = 44;

export const mapPanel = StyleSheet.create({
  btn: {
    position: 'absolute', zIndex: 3, width: BUTTON, height: BUTTON, borderRadius: BUTTON / 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  pressed: { opacity: 0.8 },
  card: {
    position: 'absolute', zIndex: 3, paddingVertical: 4, borderRadius: theme.radius, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.line,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});
