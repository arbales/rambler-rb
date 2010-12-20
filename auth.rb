use Rack::Session::Cookie

before do
  @_flash, session[:_flash] = session[:_flash], nil if session[:_flash]
end  

get '/auth/:name/callback' do
    auth = request.env['omniauth.auth']
    # do whatever you want with the information!
    person = Person.where("#{params[:name]}_uid".to_sym => auth['uid'])[0]     
    
    if person != nil   
      person.key = BCrypt::Engine.generate_salt                      
      session[:u_full_name] = auth['user_info']['name']
      session[:u_image] = (params[:name] == "facebook") ? ("https://graph.facebook.com/"+ auth['user_info']['nickname'] + "/picture") : (auth['user_info']['image'])
      person[:fb_image] = session[:u_image]
      session[:token] = Digest::SHA1.hexdigest(person.key + "salt" + person.username)
      session[:username] = person.username
      session[:userid] = person.id             
      person.save
      
      redirect "/"
    else
      #person = Person.first(:conditions => { :username => session[:username]})     
      #person[:facebook_uid] = auth['uid']
      #person.save
      abmessage :error, "Facebook user is not associated with an account."
    end  
                         
end 

get '/create-account' do
  haml :register
end

post '/register' do
  username = params[:email].sub("@odopod.com","")
  person = Person.new(:username => username,
                         :key => BCrypt::Engine.generate_salt)
  if person.save
    redirect "/token/#{username}"                         
  else
    abmessage :error, "Your user account could not be created."
  end
end
  
get '/logout' do
  session[:u_full_name] = nil
  session[:u_image] = nil
  session[:token] = nil
  session[:username] = nil
  session[:userid] = nil
  redirect "/"
end
  


             
                                                  


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