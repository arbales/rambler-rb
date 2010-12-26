get '/favicon.ico' do
  expires 31536000
  pass
end        


get '/cafe/:name.js' do
  coffee("/coffee/#{params[:name]}".to_sym, no_wrap: true)
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
  if session[:username] && session[:username].start_with?("profile.php")
    abmessage_with_redirect :error, "Sorry, you are not eligible to participate in this preview.", "/logout"
  else
    @js = ["ABApp.authorize('#{session[:token]}', '#{session[:username]}', '#{session[:userid]}')"]
  end
  
  haml :index         
end     

post '/publish' do
  $faye.get_client.publish("/" + params[:channel], {
    'text'      => params[:text],
    'username' => params[:username],
    })  
end


get '/people' do
  rack_protected!
  @people = Person.all
  haml :people
end 

get '/people/destroy' do
  Person.all.destroy_all
end  

load './posts.rb'
load './channels.rb' 

get '/hbs/:name.hbs' do
 partial params[:name]
end 