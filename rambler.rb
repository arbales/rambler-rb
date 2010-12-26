require 'sinatra/base'     
require 'coffee-script'
require 'digest/sha1'
require 'haml' 
require 'json'
require 'fileutils'
require 'omniauth'
require 'mail'
require 'padrino-helpers'
require 'postmark'
require 'sinatra/base'     

require 'renderer.rb'
 

module Rambler
  
  class Application < Sinatra::Application # I am choosing to do this.
  
    
    load './configure.rb'
    load './models.rb' 
    load './helpers.rb'
    load './auth.rb'  
    load './errors.rb'
    load './posts.rb'
    load './channels.rb' 
    
    get '/favicon.ico' do
      expires 31536000
      pass
    end        

    get '/cafe/:name.js' do
      coffee("/coffee/#{params[:name]}".to_sym, no_wrap: true)
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

    get '/hbs/:name.hbs' do
     partial params[:name]
    end 

  end  
end