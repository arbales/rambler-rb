use OmniAuth::Builder do
  provider :facebook, '172085949497689', '3bd1ec690772a06761401762720cb9e1', scope: 'email,offline_access'
end 


configure do
  set :public, File.dirname(__FILE__) + "/public"
  set :views, File.dirname(__FILE__) + "/views"
end