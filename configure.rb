use OmniAuth::Builder do                                                   
  # Wow, this is insecure ain't it!?
  provider :facebook, '172085949497689', '3bd1ec690772a06761401762720cb9e1', scope: 'email,offline_access'
end 


configure do
  set :public, File.dirname(__FILE__) + "/public"
  set :views, File.dirname(__FILE__) + "/views"
end

file_name = File.join(File.dirname(__FILE__), ".", "config", "mongoid.yml")
@mongoid_settings = YAML.load(ERB.new(File.new(file_name).read).result)

Mongoid.configure do |config|
  config.from_hash(@mongoid_settings[ENV['RACK_ENV']])
end