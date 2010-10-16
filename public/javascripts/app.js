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
    callback(message);
  }, 
  incoming: function(message, callback){
    if (message.channel == "/meta/subscribe" && message.successful == false){
      message.text = message.error;  
      App.sub.receive(message);
    } else if (message.channel == "/meta/subscribe" && message.successful == true){
      Stream.client.publish(message.subscription[0], {text:(" joined the conversation on " + message.subscription[0]), username: App.sub.getUsername(), persists: "false"});
    }
    callback(message);
  }
};    

var MentionHandler = {
  incoming: function(message, callback){
    if (message.channel == ("/mentions/"+App.sharedStorageManager.get('username')) && message.data && message.data.persists != 'false'){
    
      var mentions = $$('.mentions .count').first();
      var count = parseInt(mentions.innerHTML) || 0;
      count++;
      mentions.update(count);
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
  init: function(channels, element){
    this.element = element || null;
    //this.username = channels[0];
    this.channels = channels;
    //this.channels.push("mentions/"+this.channels[0]);
    //this.channels[0] = "people/" + this.channels[0];
    var self = this;
    this.subscriptions = this.channels.collect(function(channel){
      return Stream.client.subscribe("/"+channel, function(message){self.receive(message);});
    });
  },
  cancel: function(){
    this.subscription.cancel();
  },
  getUsername: function(){
    return App.sharedStorageManager.get('username');
  },
  receive: function(message){    
    if (this.element != null){
      var el = new Element("p");
      if (message.persists == 'false'){
        el.addClassName("persists-false");
      }

      this.element.insert({top: el.update("<span class='user'>@" + message.username + "</span>" + message.text).hide().appear()});      
        
      Event.addBehavior.reload.defer(); 
    }else{
      console.log("Unrouted Message:" + message.text);
    }
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
    Stream.client.publish("/"+this.channels[0], {text: send_text, username: this.getUsername()});
    
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
  Stream.client = new Faye.Client('http://desk.austinbales.com/faye');
  Stream.client.addExtension(ClientAuth); 
  Stream.client.addExtension(MentionHandler); 
  
  Event.addBehavior({
    "form.login:submit":function(event){
      Event.stop(event);      
      var el = this.down("input[type=text]");
      var username = $F(el).toLowerCase();
      App.sub = new Juggler("chat", $('main_stream'));

      this.fade(/*{duration:.25, queue:'end'}*/);
      $$('form.publisher').first().appear();
      
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
    },
    ".messages p img:click":function(event){
      var orig = this;
      var el = orig.clone().absolutize();
      Element.clonePosition(el, orig, {setWidth: false, setHeight: false});
      document.body.appendChild(el.setStyle({'height':'auto', 'width': 'auto', 'border':'4px solid #fff', '-webkit-box-shadow':'rgba(0,0,0,.15) 0px 2px 4px 1px'}));
      orig.morph("opacity:0");
      el.observe('mouseout', function(event){
        el.fade({duration:.25});
        orig.morph("opacity:1",{duration:.25});
      })
    },
    "form.save_auth_token:submit":function(event){     
      Event.stop(event);
      var token = $F(this.down("input[type=text][name=token]"));
      var username = $F(this.down("input[type=text][name=username]"));
      App.sharedStorageManager.set('token', token);
      App.sharedStorageManager.set('username', username);

      window.location.href = "/";
    }, 
    ".messages p span.user:click":function(){
      $$('form.publisher').first().down("input[type=text]").value = this.innerHTML.strip() + " ";
      $$('form.publisher').first().down("input[type=text]").focus();
    },
    "li.mentions:click":function(){
      var self = this;
      Element.clonePosition($('mention_stream'), self, {setWidth:false, setHeight:false, offsetTop: 40, offsetLeft: -270});
      $('mention_stream').toggle();
    },
    "#mention_stream .command a:click":function(event){
      Event.stop(event);
      var date = App.sharedStorageManager.get('last_mention_pull');
      
      var mentions = $$('.mentions .count').first();
      var count = parseInt(mentions.innerHTML) || 0;

      
      new Ajax.Request("/mentions/"+App.sharedStorageManager.get('username'), {
        method: 'get',
        parameters: {since: date},
        onSuccess: function(transport){
          var data = transport.responseText.evalJSON();
          data.each(function(message){
            count++;
            mentions.update(count);
            App.mention_watcher.receive(message);
          });
          var date = new Date();
          App.sharedStorageManager.set('last_mention_pull', date.toString());
        }, 
        onComplete: function(){

        }
      });
    }
  });
  
  if (App.sharedStorageManager.get('username') != ""){
    App.sub = new Juggler(["chat"], $('main_stream'));  
    $$('.login').first().fade();
    $$('form.publisher').first().appear();
  }
  
  if($('mention_stream').childElements().size() == 1){
    var date = App.sharedStorageManager.get('last_mention_pull');
    
    var mentions = $$('.mentions .count').first();
    var count = parseInt(mentions.innerHTML) || 0;
    
    new Ajax.Request("/mentions/"+App.sharedStorageManager.get('username'), {
      method: 'get',
      parameters: {since: date},
      onSuccess: function(transport){
        var data = transport.responseText.evalJSON();
        data.each(function(message){
          count++;
          mentions.update(count);
          App.mention_watcher.receive(message);
        });
        var date = new Date();
        App.sharedStorageManager.set('last_mention_pull', date.toString());
      }, 
    });
  }
  
  App.mention_watcher = new Juggler(['mentions/'+App.sharedStorageManager.get('username')], $('mention_stream'));
  
});


