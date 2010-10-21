get '/favicon.ico' do
  expires 31536000
  status 200
end     

error do
  if request.xhr?
    abmessage :error, "Sorry, Rambler got befuddled while doing its thing. Try again."
  else
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
  haml :index         
end

get '/create-account' do
  haml :register
end

post '/register' do
  username = params[:email].sub("@odopod.com","")
  person = Person.new(:username => username,
                         :key => Digest::SHA1.hexdigest(username))
  if person.save
    redirect "/token/#{username}"                         
  else
    abmessage :error, "Your user account could not be created."
  end
end

get '/archive/mentions/:username' do
  if params[:before] != 'false'
    mentions =  Post.where(:channel => "/mentions/#{params[:username]}")
                    .where(:created_at.lt => params[:before])
                    .ascending(:created_at)                 
  else
    since = (params[:since] != 'false') ? params[:since] : DateTime.new   
    mentions =  Post.where(:channel => "/mentions/#{params[:username]}")
                    .where(:created_at.gt => since)
                    .limit(20)
                    .descending(:created_at)
    if mentions.count == 0
      mentions =  Post.where(:channel => "/mentions/#{params[:username]}")
                      .limit(20)
                      .descending(:created_at)
    end                                    
  end
  content_type :json
  mentions.to_json
end
get '/archive/:channel' do
  # Add AUTH!
  if params[:before] != 'false'
    mentions =  Post.where(:channel => "/#{params[:channel]}")
                    .where(:created_at.lt => params[:before])
                    .ascending(:created_at)  
  else    
    since = (params[:since] != 'false') ? params[:since] : DateTime.new
    mentions =  Post.where(:channel => "/#{params[:channel]}")
                    .where(:created_at.gt => since)
                    .limit(20)
                    .descending(:created_at)
    if (mentions.count == 0 && !params[:only_current])
      mentions =  Post.where(:channel => "/#{params[:channel]}")
                      .limit(20)
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

post '/login' do
  puts params
  key = Digest::SHA1.hexdigest(params[:password]) 
  person = Person.where(username: params[:username]).where(key: key)
  if person[0] != nil
    "Success"
  else
    "Failure"
  end
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

get '/token/:username' do
  @person = Person.first(:conditions => { :username => params[:username]})     
  @token = Digest::SHA1.hexdigest(@person.key + "salt" + @person.username)
  haml :tokenstand
end