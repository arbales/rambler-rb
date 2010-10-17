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
  @posts = Post.where(:channel => "/chat").limit(30).descending(:created_at)
  haml :index         
end

get '/mentions/:username' do
  if params[:since] == 'false'
    mentions = Post.where(:channel => "/mentions/#{params[:username]}").descending(:created_at)
  else
    mentions = Post.where(:channel => "/mentions/#{params[:username]}").where(:created_at.gt => params[:since]).limit(30).descending(:created_at)
  end
  content_type :json
  mentions.to_json
end

get '/person/add/:name/:key' do
  person = Person.create(:username => params[:name], :key => Digest::SHA1.hexdigest(params[:key]))
end  

get '/people' do
  @people = Person.all
  haml :people
end   

get '/posts' do
  @posts = Post.all
  haml :posts
end

get '/posts/destroy' do
  Post.all.destroy_all
end

get '/channels' do
  @channels = Channel.all
  haml :channels
end             

post '/channels' do        
  input = params[:channel]                     
  owner = Person.where(username: input['owner']).limit(1)                                
  allowed_users = input['allowed_users'].sub("@", "").strip().split(",")
  channel = Channel.create(name: input[:name], person: owner, allowed_users: allowed_users)  
  # Add model validation to protect /meta, /mentions, and /people channels
  abmessage :success, "Your channel was created."
end 

get '/channel/destroy/:id' do
  @model = "channel"
  @id = params[:id]
  haml :destroy_confirm, layout: !
  request.xhr?
end

get '/token/:username' do
  person = Person.first(:conditions => { :username => params[:username]})     
  @token = Digest::SHA1.hexdigest(person.key + "salt" + person.username)
  haml :tokenstand
end