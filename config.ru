$LOAD_PATH.unshift File.dirname(__FILE__)

require 'faye'
require 'boot.rb' 

app = Rack::Builder.new {
  run Sinatra::Application
}

$faye = Faye::RackAdapter.new(app.to_app, :mount => '/faye')

class ServerAuth
  def incoming(message, callback)  
    # Let non-subscribe messages through
    
    unless message['channel'] == '/meta/subscribe'
      return callback.call(message)
    end                                           
    

    # Get subscribed channel and auth token
    subscription = message['subscription']
    msg_token    = message['ext'] && message['ext']['authToken']
    
  begin                                       
    if (subscription.start_with?("/people/"))                                             
      person = Person.first(:conditions => { :username => subscription.sub("/people/", "")})     
      # Add an error if the tokens don't match
      if (Digest::SHA1.hexdigest(person.key + "salt" + person.username) != msg_token)
        message['error'] = "You couldn't join #{subscription} because of a permissions problem."
      end
    end
    if (subscription.start_with?("/mentions/"))
      person = Person.first(:conditions => { :username => subscription.sub("/mentions/", "")})     
      # Add an error if the tokens don't match
      if (Digest::SHA1.hexdigest(person.key + "salt" + person.username) != msg_token)
        message['error'] = "You couldn't join #{subscription} because of a permissions problem."
      end
    end
  rescue => e
    p e     
    message['error'] = "You couldn't join #{subscription} because of a permissions problem."
  ensure
    # Call the server back now we're done
   callback.call(message)   
  end
  end
end                         

class Archiver
  def incoming(message, callback)
    if (message['data']['text'] rescue false)
      message['data']['text'].gsub!(/(?:^|\s).*\..*\/.*(\.jpg|\.jpeg|\.png|\.gif|\.tif|\.tiff|\.JPG|\.PNG|\.JPEG)(?=\s|$)/){|s|
        "<img src='#{s}'/>"
      }
    end
    
    begin
      if ((message['data']['text'] && message['data']['username'] && message['channel'] && message['data']['persists'] != 'false') rescue false)

        tokens = message['data']['text'].split(" ")        

        if(!(message['channel'].start_with?("/mentions")))
          Post.create(:text => message['data']['text'], :channel => message['channel'], :username => message['data']['username'])
        end
        if (tokens[0].start_with?("@") && !(message['channel'].start_with?("/mentions")))
          Post.create(:text => message['data']['text'], :channel => "/mentions/#{tokens[0].sub('@', '')}", :username => message['data']['username'])
          
          $faye.get_client.publish("/mentions/#{tokens[0].sub('@', '')}", {
            'text'      => message['data']['text'],
            'username' => message['data']['username']
          })
        end
        
        
      end
    rescue => e
      puts e
    ensure
      callback.call(message)   
    end
  end
end

class Formatter
  def incoming(message,callback)
    begin
    if (message['data']['text'] rescue false)
      message['data']['text'].gsub!(/(?:^|\s).*\..*\/.*(\.jpg|\.jpeg|\.png|\.gif|\.tif|\.tiff|\.JPG|\.PNG|\.JPEG)(?=\s|$)/){|s|
        "<img src='#{s}'/>"
      }
    end  
    rescue => e
      puts e
    ensure                               
      callback.call(message)
    end
  end
end

class Forwarder
  def incoming(message, clallback)
  end
end

$faye.add_extension(Archiver.new)   
$faye.add_extension(ServerAuth.new)   
#faye.add_extension(Formatter.new)

run $faye

