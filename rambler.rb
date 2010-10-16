get '/favicon.ico' do
  expires 31536000
  status 200
end

get '/' do   
  @posts = Post.where(:channel => "/chat").limit(30).descending(:created_at)
  haml :index
end

get '/mentions/:username' do
  if params[:since] == 'false'
    mentions = Post.where(:channel => "/mentions/#{params[:username]}")
  else
    mentions = Post.where(:channel => "/mentions/#{params[:username]}").where(:created_at.gt => params[:since])
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

get '/token/:username' do
  person = Person.first(:conditions => { :username => params[:username]})     
  @token = Digest::SHA1.hexdigest(person.key + "salt" + person.username)
  haml :tokenstand
end