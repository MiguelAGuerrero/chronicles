import ExpoModulesCore
import UserNotifications

public class WalkRecorderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WalkRecorder")

    Events("onLocation", "onStateChange", "onAuthorizationChange")

    OnCreate {
      let engine = WalkRecorderEngine.shared
      engine.onLocation = { [weak self] point in
        self?.sendEvent("onLocation", point)
      }
      engine.onStateChange = { [weak self] state in
        self?.sendEvent("onStateChange", state)
      }
      LocationAuthorization.shared.onChange = { [weak self] status in
        self?.sendEvent("onAuthorizationChange", ["status": status])
      }
      // In case the launch subscriber did not run (for example in a dev reload).
      engine.resumeIfNeeded()
    }

    // MARK: Recording

    Function("getStatus") { () -> [String: Any] in
      WalkRecorderEngine.shared.status()
    }

    AsyncFunction("startWalk") { (walkId: String) -> [String: Any] in
      WalkRecorderEngine.shared.start(walkId: walkId)
      return WalkRecorderEngine.shared.status()
    }.runOnQueue(.main)

    AsyncFunction("stopWalk") { () -> String? in
      WalkRecorderEngine.shared.stop()
    }.runOnQueue(.main)

    AsyncFunction("readTrace") { (walkId: String) -> [[String: Any]] in
      TraceStore.shared.readLines(for: walkId)
    }

    // MARK: Permissions

    Function("getAuthorization") { () -> [String: Any] in
      [
        "status": LocationAuthorization.shared.status(),
        "accuracy": LocationAuthorization.shared.accuracy(),
      ]
    }

    AsyncFunction("requestWhenInUse") { (promise: Promise) in
      LocationAuthorization.shared.requestWhenInUse { promise.resolve($0) }
    }.runOnQueue(.main)

    AsyncFunction("requestAlways") { (promise: Promise) in
      LocationAuthorization.shared.requestAlways { promise.resolve($0) }
    }.runOnQueue(.main)

    // MARK: Notifications

    AsyncFunction("requestNotificationPermission") { (promise: Promise) in
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in
        promise.resolve(granted)
      }
    }

    AsyncFunction("scheduleTestNotification") { (seconds: Double, body: String, promise: Promise) in
      let content = UNMutableNotificationContent()
      content.title = "Chronicles"
      content.body = body
      content.sound = .default
      let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, seconds), repeats: false)
      let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
      UNUserNotificationCenter.current().add(request) { error in
        if let error {
          promise.reject("ERR_NOTIFICATION", error.localizedDescription)
        } else {
          promise.resolve(nil)
        }
      }
    }
  }
}
