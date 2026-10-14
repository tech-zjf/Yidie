import UIKit

/// A cancel-safe Gregorian date picker. It returns a calendar date, never a timestamp.
final class YidieDatePickerController: UIViewController {
  private let picker = UIDatePicker()
  private let completion: (String?) -> Void
  private var didComplete = false

  init(currentDate: String?, completion: @escaping (String?) -> Void) {
    self.completion = completion
    super.init(nibName: nil, bundle: nil)
    if let currentDate, let date = Self.date(from: currentDate) {
      picker.date = date
    } else {
      picker.date = Date()
    }
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    picker.datePickerMode = .date
    picker.preferredDatePickerStyle = .inline
    picker.calendar = Self.calendar
    picker.locale = Locale(identifier: "en_US_POSIX")
    picker.timeZone = .current
    picker.translatesAutoresizingMaskIntoConstraints = false

    let cancel = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(cancelSelection))
    let title = UIBarButtonItem(title: "Choose a date", style: .plain, target: nil, action: nil)
    title.isEnabled = false
    let done = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(confirmSelection))
    let spacer = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
    let toolbar = UIToolbar()
    toolbar.items = [cancel, spacer, title, spacer, done]
    toolbar.translatesAutoresizingMaskIntoConstraints = false

    view.addSubview(toolbar)
    view.addSubview(picker)
    NSLayoutConstraint.activate([
      toolbar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      toolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      toolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      picker.topAnchor.constraint(equalTo: toolbar.bottomAnchor, constant: 8),
      picker.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      picker.bottomAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),
    ])
  }

  @objc private func cancelSelection() {
    finish(nil)
  }

  @objc private func confirmSelection() {
    let parts = Self.calendar.dateComponents([.year, .month, .day], from: picker.date)
    guard let year = parts.year, let month = parts.month, let day = parts.day else {
      finish(nil)
      return
    }
    finish(String(format: "%04d-%02d-%02d", year, month, day))
  }

  private func finish(_ date: String?) {
    guard !didComplete else { return }
    didComplete = true
    dismiss(animated: true) { [completion] in completion(date) }
  }

  private static var calendar: Calendar {
    var value = Calendar(identifier: .gregorian)
    value.timeZone = .current
    value.locale = Locale(identifier: "en_US_POSIX")
    return value
  }

  private static func date(from value: String) -> Date? {
    let parts = value.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3,
          let date = calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12)) else {
      return nil
    }
    let roundTrip = calendar.dateComponents([.year, .month, .day], from: date)
    guard roundTrip.year == parts[0], roundTrip.month == parts[1], roundTrip.day == parts[2] else { return nil }
    return date
  }
}
