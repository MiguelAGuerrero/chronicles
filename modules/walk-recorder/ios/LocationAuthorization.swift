import Foundation
import CoreLocation

/// Requests location authorization in two steps: When In Use first, then Always.
/// iOS shows the Always upgrade prompt only once per install, so the app should ask
/// for it at a moment the user understands why (the first walk).
final class LocationAuthorization: NSObject, CLLocationManagerDelegate {
  static let shared = LocationAuthorization()

  private var manager: CLLocationManager?
  private var pending: [(String) -> Void] = []
  var onChange: ((String) -> Void)?

  private func ensureManager() -> CLLocationManager {
    if let manager { return manager }
    let created = CLLocationManager()
    created.delegate = self
    manager = created
    return created
  }

  func status() -> String {
    LocationAuthorization.describe(ensureManager().authorizationStatus)
  }

  func accuracy() -> String {
    ensureManager().accuracyAuthorization == .fullAccuracy ? "full" : "reduced"
  }

  func requestWhenInUse(_ completion: @escaping (String) -> Void) {
    let manager = ensureManager()
    guard manager.authorizationStatus == .notDetermined else {
      completion(status())
      return
    }
    pending.append(completion)
    manager.requestWhenInUseAuthorization()
  }

  func requestAlways(_ completion: @escaping (String) -> Void) {
    let manager = ensureManager()
    guard manager.authorizationStatus == .notDetermined || manager.authorizationStatus == .authorizedWhenInUse else {
      completion(status())
      return
    }
    pending.append(completion)
    manager.requestAlwaysAuthorization()
    // If iOS declines to show the prompt (already asked once), no callback arrives.
    DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
      self?.flush()
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    onChange?(status())
    if manager.authorizationStatus != .notDetermined {
      flush()
    }
  }

  private func flush() {
    let callbacks = pending
    pending.removeAll()
    let current = status()
    callbacks.forEach { $0(current) }
  }

  static func describe(_ status: CLAuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "notDetermined"
    case .restricted: return "restricted"
    case .denied: return "denied"
    case .authorizedAlways: return "always"
    case .authorizedWhenInUse: return "whenInUse"
    @unknown default: return "unknown"
    }
  }
}
