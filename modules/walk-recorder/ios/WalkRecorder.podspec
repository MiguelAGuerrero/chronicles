Pod::Spec.new do |s|
  s.name           = 'WalkRecorder'
  s.version        = '1.0.0'
  s.summary        = 'Background walk recording for Chronicles'
  s.description    = 'Records walks with CLLocationUpdate.liveUpdates and a CLBackgroundActivitySession, writing append-only JSON Lines traces.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '17.0'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
