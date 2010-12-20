use OmniAuth::Builder do
  provider :facebook, ENV['FB_APP_ID'], ENV['FB_APP_KEY'], scope: 'email,offline_access'
end

configure do
  set :public, File.dirname(__FILE__) + "/public"
  set :views, File.dirname(__FILE__) + "/views"
end