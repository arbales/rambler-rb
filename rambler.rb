get '/favicon.ico' do
  expires 31536000
  status 200
end

get '/' do      
  @posts = Post.all.reverse
  haml :test
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