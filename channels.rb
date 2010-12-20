
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