Pod::Spec.new do |s|
  s.name           = 'ChroniclesVideoEdit'
  s.version        = '1.0.0'
  s.summary        = 'Renders an edited copy of a video (rotate, crop, scale, trim, overlay) to MP4.'
  s.description    = 'Local Expo module for Chronicles: AVFoundation export of an edited video.'
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
  s.frameworks = 'AVFoundation', 'CoreMedia', 'QuartzCore', 'ImageIO'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
