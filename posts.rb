get '/posts' do
  @posts = Post.all
  haml :posts
end

get '/posts/destroy' do
  Post.all.destroy_all
end