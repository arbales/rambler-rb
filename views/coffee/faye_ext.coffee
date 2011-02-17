# ### MessageIDHandler
# An extension that provides a unique id to each outgoing and
# incoming messages.

MessageIDHandler = {
  incoming: (message, callback) ->
    unless message.id?
      message.id = ABApp.generate_uuid()
      message.data._id = message_id
    callback message
  
  outgoing: (message, callback) ->
    unless message.id?
      message.id = ABApp.generate_uuid()
    callback message
}                    

# ### ClientAuth
# An extension for subscription authentication.
# Uses a stored value from localStorage for the token and username.

ClientAuth = {
  outgoing: (message, callback) ->
    if message.channel == '/meta/subscribe'
      message.ext ||= {}
      message.ext.authToken = ABApp.sharedStorageManager().get 'token'
      message.ext.authUser = ABApp.sharedStorageManager().get 'username'
      message.ext.authUserID = ABApp.sharedStorageManager().get 'userid' 
    callback message
  
  # Inserts welcome notification into messages resulting from a subscription.
  incoming: (message, callback) ->
    unless message.username
      message.username = 'rambler'
    
    if message.channel == '/meta/subscribe' && not message.successful
      message.text = message.error
      if message.error == 'You are not logged in.'
        ABApp.deauthorize()
        $$('.account').first().remove()
        setTimeout ->
          window.location.href = '/logout'
        , 400
      ABApp.channels['chat'].receive message
    # else if message.channel == '/meta/subscribe' && message.successful is true
      
    callback message
}  

# ### MentionHandler              
# An extenson to pubsub providing mention detecting and processing.

MentionHandler = {
  # Update the message count
  incoming: (message, callback) ->
    if message.channel == "/mentions/#{ABApp.sharedStorageManager().get('username')}" &&
      message.data? && message.data.persists isnt false
        if message.data.username != ABApp.sharedStorageManager().get('username')
          new ABMessage("<span class='user'>#{message.data.username} mentioned you&hellip;</span>#{message.data.text}", {
            onClose: ->
              if message.data.invitation?
                EUWindowWaker.wake "channel:join", {channel: message.data.invitation}
          })
    callback message
}

GroupFilter = {
  outgoing: (message,callback) ->
    matches = []
    if message.data && message.data.text && not message.data.text.startsWith("reply") && message.data.text.scan(/\[(.*)\]/, (match) ->
      matches.push match
    ) && matches.length > 0
      message.data.text = message.data.text.gsub(/\[(.*)\]/, "")
      message.channel = "/#{matches[0][1]}"
    callback message
}    

Threader = {
  outgoing: (message,callback) ->
    matches = []
    if message.data && message.data.text
      puts message.data.text
    if message.data && message.data.text && message.data.text.scan(/reply\[(.*)\]\[(.*)\]/, (match) ->
      matches.push match
    ) && matches.length > 0
      message.data.text = message.data.text.gsub(/reply\[(.*)\]\[(.*)\]/, "")
      message.channel = "/#{matches[0][1]}"
      message.data.reply = matches[0][2]
    puts matches
    callback message
}