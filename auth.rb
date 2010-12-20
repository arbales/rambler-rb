use Rack::Session::Cookie

before do
  @_flash, session[:_flash] = session[:_flash], nil if session[:_flash]
  #@current_user = nil                            
  #@current_organization = nil
  
  #if (session['user_id'] != nil) then
  #  @current_user = Person.get(session['user_id'])
  #  @current_organization = @current_user.organization  
  #  p @current_organization
  #else
  #  session['ip'] = @env['REMOTE_ADDR']
  #  session['user_id'] = nil
  #end  
  #if (@current_user.nil? && !['/','/login','/register', '/css','/js', '/images', 'favicon.ico'].include?(request.path_info))
  #  error 403
  #end      
end 

##error 403 do
#  haml "errors/403".to_sym
#end  

#facebook do
#   api_key  '77e7edb1f78e0d9d1ec454498d354a4e'
#   secret   '3bd1ec690772a06761401762720cb9e1'
#   app_id   172085949497689
#   url      'http://fiesta.austinbales.com:3000/'
#   callback 'http://fiesta.austinbales.com:3000/'
# end      


             
                                                  


def rack_protected!
  response['WWW-Authenticate'] = %(Basic realm="Podium Core") and \
  throw(:halt, [401, "Not authorized\n"]) and \
  return unless rack_authorized?
end

def rack_authorized?
  @auth ||=  Rack::Auth::Basic::Request.new(request.env)
  @auth.provided? && @auth.basic? && @auth.credentials && @auth.credentials == ['ccon', 'rocketlemon']
end


def requires_session_with_redirect!
  unless (@current_user rescue nil)
    redirect "/login?return_to=#{request.path_info}"
  end
end                  


def requires_users!(array)
  unless (arrayclass == Array)
    error "An array of users is required.", 500
    halt
  end                                          
  protect_silently!
  if (array.include?(@current_user))
    return true
  else
    return false
  end
end

def protected!
  requires_session_with_redirect!
   
#   if (@user.needs_to_reset_password)
#     redirect '/me?return_to=' + request.path
#   elsif (!@user.accepted_aggreement?)
#     redirect '/agreements?return_to=' + request.path
#   end
end

def protected_for_users_with_redirect!(collection)
#  unless (collection.class == DataMapper::Collection)
#    error "An collection of users is required.", 500
#    halt
#  end
  unless (@current_user)
    redirect "/login?return_to=#{request.path_info}"
  end
  if (collection.include?(@current_user) rescue false)
    return true
  else
    flash[:error] = "Sorry, you don't have permission to do that."
    redirect "/"
  end  
end              

def protected_for_users!(collection)
  unless (collection.class == DataMapper::Collection)
    error "An collection of users is required.", 500
    halt
  end
  if (collection.include?(@current_user) rescue false)
    return true
  else
    error "You don't have permission to access that resource.", 403
  end
end
                    
def protect_silently!
  unless (@current_user rescue nil)
    error "Either your session expired or you are not logged in.", 403
    halt
  end
  
end