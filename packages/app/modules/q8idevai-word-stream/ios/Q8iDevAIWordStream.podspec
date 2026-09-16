Pod::Spec.new do |s|
  s.name = 'Q8iDevAIWordStream'
  s.version = '0.1.0'
  s.summary = 'Native word streaming for Q8iDevAI'
  s.description = 'Native word streaming for Q8iDevAI'
  s.license = { :type => 'MIT', :file => '../LICENSE' }
  s.author = 'Q8iDevAI'
  s.homepage = 'https://q8idevai.sh'
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = ['*.swift', 'internal/*.swift']
end
