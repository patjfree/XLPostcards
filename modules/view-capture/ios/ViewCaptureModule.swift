import ExpoModulesCore
import UIKit

public class ViewCaptureModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ViewCapture")

    AsyncFunction("capture") { (reactTag: Int, options: [String: Any]) -> [String: Any] in
      return try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          do {
            guard let appContext = self.appContext,
                  let bridge = appContext.reactBridge,
                  let uiManager = bridge.uiManager else {
              continuation.resume(throwing: ViewCaptureError.bridgeNotFound)
              return
            }

            uiManager.addUIBlock { (uiMgr, viewRegistry) in
              guard let viewRegistry = viewRegistry,
                    let view = viewRegistry[NSNumber(value: reactTag)] as? UIView else {
                continuation.resume(throwing: ViewCaptureError.viewNotFound)
                return
              }

              do {
                let result = try self.captureView(view: view, options: options)
                continuation.resume(returning: result)
              } catch {
                continuation.resume(throwing: error)
              }
            }
          }
        }
      }
    }
  }

  private func captureView(view: UIView, options: [String: Any]) throws -> [String: Any] {
    // Options with defaults
    let width = options["width"] as? CGFloat ?? view.bounds.width
    let height = options["height"] as? CGFloat ?? view.bounds.height
    let scale = options["scale"] as? CGFloat ?? 1.0  // Force 1 to avoid 2x scaling
    let opaque = options["opaque"] as? Bool ?? true
    let bgHex = options["backgroundColor"] as? String ?? "#FFFFFF"

    let size = CGSize(width: width, height: height)
    let format = UIGraphicsImageRendererFormat()
    format.opaque = opaque
    format.scale = scale  // This prevents the 2x iOS scaling issue

    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    let image = renderer.image { ctx in
      // Fill background first to prevent black/transparent artifacts
      UIColor(hex: bgHex).setFill()
      ctx.fill(CGRect(origin: .zero, size: size))

      // Render the view's layer at 1x into the context
      // Use drawHierarchy for better fidelity with text and effects
      let renderRect = CGRect(origin: .zero, size: size)
      if !view.drawHierarchy(in: renderRect, afterScreenUpdates: true) {
        // Fallback to layer rendering if drawHierarchy fails
        view.layer.render(in: ctx.cgContext)
      }
    }

    guard let data = image.pngData() else {
      throw ViewCaptureError.encodingFailed
    }

    let fileName = "capture-\(UUID().uuidString).png"
    let filePath = (NSTemporaryDirectory() as NSString).appendingPathComponent(fileName)
    
    try data.write(to: URL(fileURLWithPath: filePath))
    
    return [
      "uri": "file://\(filePath)",
      "width": width,
      "height": height,
      "scale": scale
    ]
  }
}

enum ViewCaptureError: Error {
  case bridgeNotFound
  case viewNotFound
  case encodingFailed
  case writeFailed
}

// Helper extension for hex color parsing
extension UIColor {
  convenience init(hex: String) {
    var hexString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if hexString.hasPrefix("#") {
      hexString.removeFirst()
    }
    
    var rgbValue: UInt64 = 0
    Scanner(string: hexString).scanHexInt64(&rgbValue)
    
    let red, green, blue: CGFloat
    switch hexString.count {
    case 6:
      red = CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0
      green = CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0
      blue = CGFloat(rgbValue & 0x0000FF) / 255.0
    default:
      red = 1.0
      green = 1.0
      blue = 1.0
    }
    
    self.init(red: red, green: green, blue: blue, alpha: 1.0)
  }
}