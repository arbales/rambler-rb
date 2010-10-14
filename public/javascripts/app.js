Stream = {};
App = {};

function urlify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
    });
    
    return text.replace(/(?:^|\s).*\..*\/.*(\.jpg|\.jpeg|\.png|\.gif|\.tif|\.tiff)(?=\s|$)/, function(img){
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

def ("Juggler")({
  init: function(channels){
    $$('.messages').first().update();
    this.username = channels[0];
    this.channels = channels;
    this.channels[0] = "people/" + this.channels[0]
    var self = this;
    this.subscriptions = this.channels.collect(function(channel){
      return Stream.client.subscribe("/"+channel, function(message){self.receive(message);});
    });
    
    this.send("joined the convo.");
  },
  cancel: function(){
    this.subscription.cancel();
  },
  receive: function(message){
    var el = new Element("p");
    console.log(message);
    $$('.messages').first().insert({top: el.update("<span class='user'>@" + message.username + "</span>&nbsp;" + urlify(message.text) + " <button class='sidebar'>sidebar</button>").hide().appear({duration:.25, queue: 'end'})});
    if (message.text.include(this.username)){
      el.highlight({queue:'end', delay: .1, duration:2});
    }
    Event.addBehavior.reload.defer(); 
  },
  send: function(send_text){
    groups = []
    send_text.scan(/\[.*\]/, function(s){
      groups += s;
    });

    groups.each(function(s){
      var len = s.length;
      alert("/"+s.substr(1, length -2));
      Stream.client.publish("/"+s.substr(1, length -2), {text: send_text, username: this.username});
    });
    Stream.client.publish("/"+this.channels[0], {text: send_text, username: this.username});
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
  
  Stream.client = new Faye.Client('http://desk.austinbales.com/faye');
  
  Event.addBehavior({
    "form.login:submit":function(event){
      Event.stop(event);
      sub.login($F(this.down('input[type=text]')));
      this.fade({duration:.25, queue:'end'});
      $$('form.publisher').first().appear({duration:.25, queue:'end'});
      
      window.onbeforeunload = function (){
        return sub.send("left the chat.");
      }
      
    },
    "form.publisher:submit":function(event){
      Event.stop(event);
      var el = this.down('input[type=text]');
      Apsub = new Juggler([$F(el).toLowerCase, "chat"]);
      el.clear();
    }
  });
  
  if (getQuerystring("username") != ""){
    App.subb = new Juggler([getQuerystring("username"), "chat"]);  
    $$('.login').first().fade({duration:.25, queue:'end'});
    $$('form.publisher').first().appear({duration:.25, queue:'end'});
  }
  
});


