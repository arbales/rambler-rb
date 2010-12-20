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

load './posts.rb'
load './channels.rb' 

get '/hbs/:name.hbs' do
 partial params[:name]
end 