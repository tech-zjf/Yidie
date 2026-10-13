Pod::Spec.new do |s|
  s.name = 'YidieNative'
  s.version = '0.1.0'
  s.summary = 'Local PhotoKit and Vision for Yidie'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Yidie contributors'
  s.homepage = 'https://github.com/tech-zjf/Yidie'
  s.source = { :git => 'https://github.com/tech-zjf/Yidie.git' }
  s.platforms = { :ios => '17.0' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Photos', 'Vision', 'CoreImage', 'ImageIO', 'CryptoKit'
  s.source_files = '**/*.swift'
end
