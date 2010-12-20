class ServerAuth
  def incoming(message, callback)  
    # Let non-subscribe messages through
    
    unless message['channel'] == '/meta/subscribe'
      return callback.call(message)
    end                                           
    

    # Get subscribed channel and auth token
    subscription = message['subscription']
    msg_token    = message['ext'] && message['ext']['authToken']
    msg_user    = message['ext'] && message['ext']['authUser']
    msg_userid    = message['ext'] && message['ext']['authUserID']
    
  begin
    
    unless (msg_token && msg_user && msg_userid && Person.criteria.id(msg_userid).limit(1)[0].verify(msg_token)) 
      message['ext']['status'] = 'logout'
      message['error'] = "You are not logged in."
#      raise NotLoggedIn
    end
    
    if (subscription.start_with?("/people/"))                                             
      person = Person.first(:conditions => { :username => subscription.sub("/people/", "")})     
      # Add an error if the tokens don't match
      unless (person.verify(msg_token))
        message['ext']['channel_reference'] = subscription
        message['error'] = "You couldn't join #{subscription} because of a permissions problem."
      end
    elsif (subscription.start_with?("/mentions/"))
      person = Person.first(:conditions => { :username => subscription.sub("/mentions/", "")})     
      # Add an error if the tokens don't match
      unless (person.verify(msg_token))
        message['ext']['channel_reference'] = subscription
        message['error'] = "You couldn't join #{subscription} because of a permissions problem."
      end
    elsif (sub = Channel.first(conditions:{name: subscription.sub("/", "")}))
      person = Person.criteria.id(msg_userid).limit(1)[0]     
      if sub.allowed_users.include?(person.username) && person.verify(msg_token)
        # successful
      else
        message['error'] = "#{person.username} couldn't join #{subscription}, are you allowed to?"
      end  
    end 
  rescue NotLoggedIn
    message['ext']['channel_reference'] = subscription
    message['error'] = "You are not logged in."
  rescue => e
    message['ext']['channel_reference'] = subscription
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