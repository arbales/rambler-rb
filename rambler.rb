get '/favicon.ico' do
  expires 31536000
  pass
end     

error do
  if request.xhr?  
    abmessage :error, "Sorry, Rambler got befuddled while doing its thing. Try again."
  else
    puts "!! Finding error thing."
    haml :error
  end
end

not_found do  
  status 404
  if request.xhr?
    abmessage :error, "Sorry, Rambler couldn&rsquo;t figure out what to do with your request."
  else
    haml :error
  end
end

get '/' do  
  @js = ["ABApp.authorize('#{session[:token]}', '#{session[:username]}', '#{session[:userid]}')"]
  haml :index         
end     

get '/logout' do
  session[:u_full_name] = nil
  session[:u_image] = nil
  session[:token] = nil
  session[:username] = nil
  session[:userid] = nil
  redirect "/"
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

get '/archive/mentions/:username' do  
  
  person = Person.criteria.id(params[:api_user_id]).limit(1)[0]
  unless person && person.username == params[:username] && person.verify(params[:api_user_key])
    error 403, "You aren't authorized to read this stream."
  end
  
  if params[:before] != 'false'
    mentions =  Post.where(:channel => "/mentions/#{params[:username]}")
                    .where(:created_at.lt => params[:before])
                    .ascending(:created_at)                 
  else
    since = (params[:since] != 'false') ? params[:since] : DateTime.new   
    mentions =  Post.where(:channel => "/mentions/#{params[:username]}")
                    .where(:created_at.gt => since)
                    .limit(50)
                    .descending(:created_at)
    if mentions.count == 0
      mentions =  Post.where(:channel => "/mentions/#{params[:username]}")
                      .limit(50)
                      .descending(:created_at)
    end                                    
  end
  content_type :json
  mentions.to_json
end
get '/archive/:channel' do
  # Add AUTH!
  
  person = Person.criteria.id(params[:api_user_id]).limit(1)[0]
  unless person && person.verify(params[:api_user_key])
    error 403, "You aren't authorized to read this stream."
  end
  
  if params[:before] != 'false'
    mentions =  Post.where(:channel => "/#{params[:channel]}")
                    .where(:created_at.lt => params[:before])
                    .ascending(:created_at)  
  else    
    since = (params[:since] != 'false') ? params[:since] : DateTime.new
    mentions =  Post.where(:channel => "/#{params[:channel]}")
                    .where(:created_at.gt => since)
                    .limit(50)
                    .descending(:created_at)
    if (mentions.count == 0 && !params[:only_current])
      mentions =  Post.where(:channel => "/#{params[:channel]}")
                      .limit(50)
                      .descending(:created_at)
    end                                    
  end
  content_type :json
  mentions.to_json
end

post '/publish' do
  $faye.get_client.publish("/" + params[:channel], {
    'text'      => params[:text],
    'username' => params[:username],
    })  
end


get '/people' do
  @people = Person.all
  haml :people
end   

get '/people/destroy' do
 Person.all.destroy_all 
end

get '/posts' do
  @posts = Post.all
  haml :posts
end

get '/posts/destroy' do
  Post.all.destroy_all
end  

delete '/channel/:id' do
  channel = Channel.criteria.id(params[:id])[0]    
  channel.destroy
end

get '/channels' do
  @channels = Channel.all
  haml :channels
end    

get '/channels/destroy' do
  Channel.all.destroy_all
end  

post '/channels/sidebar' do
  members = params[:members].strip().split(",")    
  user = params[:username]                       
  name = params[:name]
  
end      

post '/channels' do        
  input = params[:channel]                     
  
  owner = Person.criteria.id(params[:userid]).limit(1)[0]
                                 
  allowed_users = input['allowed_users'].strip()
                                        .split(",")
                                        .map do |u|; u.sub("@", "").strip(); end

  channel = Channel.new(name: input[:name],
                           person: owner,
                           allowed_users: allowed_users)
  if channel.save                                                               
    $faye.get_client.publish("/mentions/#{owner.username}", {
      'text' => "You created and joined #{input[:name]}",
      'username' => 'rambler'
    })                                      
    (allowed_users - [owner.username]).each do |member|
      $faye.get_client.publish("/mentions/#{member}", {
        'text'      => "#{owner.username} invited you to join /#{input[:name]}",
        'username' => owner.username,
        'invitation' => input[:name],
        })                    
    end                                        

    # Add model validation to protect /meta, /mentions, and /people channels
    abmessage :success, "Your channel was created."
  else
    abmessage :error, "Your channel could not be created."
  end
end 

get '/channel/destroy/:id' do
  @model = "channel"
  @id = params[:id]
  haml :destroy_confirm, layout: !request.xhr?
end  

get '/hbs/:name.hbs' do
 partial params[:name]
end 