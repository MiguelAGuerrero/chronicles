Pod::Spec.new do |s|
  s.name           = 'ChroniclesAudioDecode'
  s.version        = '1.0.0'
  s.summary        = 'Decodes an audio file to 16 kHz mono 16-bit PCM WAV.'
  s.description    = 'Local Expo module for Chronicles: AVFoundation decode of a voice memo for an offline transcriber.'
  s.license        = 'UNLICENSED'
  s.author         = 'Chronicles'
  s.homepage       = 'https://docs.expo.dev/modules/'
  # Same floor as ExpoModulesCore and the expo-* modules of SDK 58.
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'CoreMedia'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
