Stream = {};
App = {};  
App.authToken = '0';
function urlify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
    });
    
    return text.replace(/(?:^|\s).*\..*\/.*(\.jpg|\.jpeg|\.png|\.gif|\.tif|\.tiff|\.JPG|\.PNG|\.JPEG)(?=\s|$)/, function(img){
      if (img.substr(0,7) != "http://"){
        return '<img src="http://' + img + '"/>';
      }else{
        return '<img src="' + img + '"/>';
      }
    });    
    
    // or alternatively
    // return text.replace(urlRegex, '<a href="$1">$1</a>')
}

function getQuerystring(key, default_)
{
  if (default_==null) default_=""; 
  key = key.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regex = new RegExp("[\\?&]"+key+"=([^&#]*)");
  var qs = regex.exec(window.location.href);
  if(qs == null)
    return default_;
  else
    return qs[1];
}  

var ClientAuth = {
  outgoing: function(message, callback){
    if (message.channel == '/meta/subscribe'){
      message.ext = {};
      message.ext.authToken = App.sharedStorageManager.get('token');
    }                      
//    console.log(message);
    callback(message);
  }, 
  incoming: function(message, callback){
    if (message.channel == "/meta/subscribe" && message.successful == false){
      message.text = message.error;  
      App.sub.receive(message);
    } else if (message.channel == "/meta/subscribe" && message.successful == true){
      Stream.client.publish(message.subscription[0], {text:("joined the conversation on " + message.subscription[0]), username: App.sub.username, persists: "false"});
    }
    callback(message);
  }
};       

def ("StorageManager")({
  init: function(){
    
  },
  get: function(key){
	  var data = localStorage.getItem(key);
		if (data == "" || data == null){
			return false;
		} else {
			return data;
		}
  },
  set: function(key, value){
    localStorage.setItem(key, value);
    return value;
  }
});

def ("Juggler")({
  init: function(channels){
//    $$('.messages').first().update();
    this.username = channels[0];
//    this.username = username; 
    this.channels = channels;
    this.channels[0] = "people/" + this.channels[0];
    var self = this;
    this.subscriptions = this.channels.collect(function(channel){
      return Stream.client.subscribe("/"+channel, function(message){self.receive(message);});
    });
    
    //this.send("joined the convo.");
  },
  cancel: function(){
    this.subscription.cancel();
  },
  receive: function(message){    
    var el = new Element("p");
    console.info(message);
    if (message.persists == 'false'){
      el.addClassName("persists-false");
    }
    $$('.messages').first().insert({top: el.update("<span class='user'>@" + message.username + "</span>" + message.text/*+ " <button class='sidebar'>sidebar</button>"*/).hide().appear({duration:.25, queue: 'end'})});
    if (message.text.include(this.username)){
      el.highlight({queue:'end', delay: .1, duration:2});
    }
    Event.addBehavior.reload.defer(); 
  },
  send: function(send_text){
   /* groups = []
    send_text.scan(/\[.*\]/, function(s){
      groups += s;
    });

    groups.each(function(s){
      var len = s.length;
      alert("/"+s.substr(1, length -2));
      Stream.client.publish("/"+s.substr(1, length -2), {text: send_text, username: this.username});
    });   */
//    Stream.client.publish("/"+this.channels[0], {text: send_text, username: this.username});
    Stream.client.publish("/"+this.channels[1], {text: send_text, username: this.username});
    
  },
});

/*
* 1. Subscribe to /mentions/arbales (public)
* 2. Subscribe to /dm/arbales (private)
* 3. Subscribe to /from/arbales (public, self-subscribed)
* 4. Subscribe 
*/

document.observe('dom:loaded', function(){
  document.stopObserving('dom:loaded');
   
  App.sharedStorageManager = new StorageManager();
  Stream.client = new Faye.Client('http://bubbles.local:3000/faye');
  Stream.client.addExtension(ClientAuth);  
  
  Event.addBehavior({
    "form.login:submit":function(event){
      Event.stop(event);      
      var el = this.down("input[type=text]");
      var username = $F(el).toLowerCase();
      App.sub = new Juggler([username, "chat"]);
//      App.sub = new Juggler(username,["chat"]);  

      this.fade({duration:.25, queue:'end'});
      $$('form.publisher').first().appear({duration:.25, queue:'end'});
      
      window.onbeforeunload = function (){
        return App.sub.send("left the chat.");
      }
      
    },
    "form.publisher:submit":function(event){
      Event.stop(event);
      var el = this.down('input[type=text]');
      App.sub.send($F(el));
      el.clear();
    }, 
    "form.publisher input[type=text]:drop":function(event){
//      Event.stop(event);
      alert("Drop!");
    },
    ".messages p img:mouseover":function(event){
      var orig = this;
      var el = this.clone().absolutize().setStyle({'width':'auto', 'height':'auto', 'max-height':'500px'});
        this.insert({after: el});
        Element.clonePosition(el, orig, {setWidth: false, setHeight: false, offsetTop:((orig.getHeight() - el.getHeight())/2), offsetLeft: ((orig.getWidth()-el.getWidth())/2)});
        el.observe('mouseout', function(evt){
          el.remove(); 
        });                                         
    },
    "form.save_auth_token:submit":function(event){     
      Event.stop(event);
      var token = $F(this.down("input[type=text]"));
      App.sharedStorageManager.set('token', token);
      window.location.href = "/";
    }, 
    ".messages p span.user:click":function(){
      $$('form.publisher').first().down("input[type=text]").value = this.innerHTML.strip() + " ";
      $$('form.publisher').first().down("input[type=text]").focus();
    }
  });
  
  if (getQuerystring("username") != ""){
    App.sub = new Juggler([getQuerystring("username"), "chat"]);  
    //App.sub = new Juggler(getQuerystring("username"),["chat"]);  
    $$('.login').first().fade({duration:.25, queue:'end'});
    $$('form.publisher').first().appear({duration:.25, queue:'end'});
  }
  
});


