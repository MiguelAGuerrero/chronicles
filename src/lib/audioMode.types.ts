/** How the app's sound behaves: what expo-audio's setAudioModeAsync takes. */
export interface AudioMode {
  /** Play even with the ringer switch off (memos and videos are the point). */
  playsInSilentMode: boolean;
  allowsRecording: boolean;
  /** Keep recording with the phone locked (native only). */
  allowsBackgroundRecording?: boolean;
}
