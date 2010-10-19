// ### ClientAuth              
//  An extension for subscription authentication.
//  Uses a stored value from localStorage for the token  and username. 
ClientAuth = {

  // Adds authentication information to outgoing subscription messages and calls a callback function to continue sending.
  outgoing: function(message, callback){
    if (message.channel == '/meta/subscribe'){
      message.ext = {};
      message.ext.authToken = ABApp.sharedStorageManager().get('token');
      message.ext.authUser = ABApp.sharedStorageManager().get('username');
      message.ext.authUserID = ABApp.sharedStorageManager().get('userid');
    }                      
    callback(message);
  },      

  // Inserts welcome notification into messages resulting from a subscription. 
  incoming: function(message, callback){
    if (message.username == undefined){
      message.username = 'rambo';
    }
    if (message.channel == "/meta/subscribe" && message.successful == false){
      message.text = message.error;  
      //ABApp.channels[message.channel_reference].cancel();
      ABApp.channels['chat'].receive(message);
    } else if (message.channel == "/meta/subscribe" && message.successful == true){
      ABApp.stream.client.publish(message.subscription[0], {
        text:(" joined the conversation on " + message.subscription[0]), 
        username: ABApp.channels['chat'].getUsername(), 
        persists: "false"});
    }
    callback(message);
  }
};       

 
// ### MentionHandler              
//  An extenson to pubsub providing mention detecting and processing.

var MentionHandler = {                      
  // Update the message count
  incoming: function(message, callback){
    if (message.channel == ('/mentions/'+ABApp.sharedStorageManager().get('username')) && 
        message.data && 
        message.data.persists != 'false')
    {
			new ABMessage("<span class='user'>"+message.data.username+" mentioned you&hellip;</span>"+message.data.text, {timeout: 10});
    }
    callback(message); 
  }
};

var GroupFilter = {
  outgoing: function(message, callback){
    var groups = [];
    if (message.data && message.data.text && message.data.text.scan(/\[(.*)\]/, function(match){
      groups.push(match);
    }) && (groups.length > 0)){
      console.log(groups[0][1]);
      message.data.text = message.data.text.gsub(/\[(.*)\]/, "");
      message.channel = "/" + groups[0][1];
    }
    callback(message);
  }
}
