import ExpoModulesCore
import UIKit

/// Resumes an open walk as early as possible in the app's launch, before JavaScript
/// starts. This also covers launches where iOS starts the app in the background to
/// deliver location updates for a session that was running when the app was terminated.
public class WalkRecorderAppDelegate: BaseExpoAppDelegateSubscriber, ExpoAppDelegateSubscriberProtocol {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    WalkRecorderEngine.shared.resumeIfNeeded()
    return true
  }
}
