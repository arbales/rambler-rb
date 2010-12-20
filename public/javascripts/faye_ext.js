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
      if (message.error == "You are not logged in."){
        ABApp.deauthorize();
        $$('.account')[0].remove(); 
        setTimeout(function() {
          window.location.href="/logout";
        }, 400);
      }
      ABApp.channels['chat'].receive(message);
      //ABApp.channels[message.channel_reference].cancel();
    } else if (message.channel == "/meta/subscribe" && message.successful == true){
      /*ABApp.stream.client.publish(message.subscription[0], {
        text:(" joined the conversation on " + message.subscription[0]), 
        username: ABApp.channels['chat'].getUsername(), 
        persists: "false"}); */
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
      if (message.data.username != ABApp.sharedStorageManager().get('username'))
			new ABMessage("<span class='user'>"+message.data.username+" mentioned you&hellip;</span>"+message.data.text, {timeout: 10, 
			    onClose: function(){
			      if (message.data.invitation != undefined){
			        EUWindowWaker.wake("channel:join", {channel: message.data.invitation});
		        }
			    }
			  });
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


var ISODate = {
    convert : function (input){
        if (!(typeof input === "string")) throw "ISODate, convert: input must be a string";
        var d = input.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(Z|(([+-])(\d{2}):(\d{2})))$/i);
        if (!d) throw "ISODate, convert: Illegal format";
        return new Date(
                Date.UTC(d[1],d[2]-1,d[3],d[4],d[5],d[6]|0,(d[6]*1000-((d[6]|0)*1000))|0,d[7]) +
                (d[7].toUpperCase() ==="Z" ? 0 : (d[10]*3600 + d[11]*60) * (d[9]==="-" ? 1000 : -1000))
        );
    },
    format : function(t,utc){
        if (typeof t === "string") t = this.convert(t);
        if (!(t instanceof Date)) throw "ISODate, format: t is not a date object";
        t = utc ?
                [t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate(),t.getUTCHours(),t.getUTCMinutes(),t.getUTCSeconds()] :
                [t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds()];

        return this.month[t[1]] + " " +this.ordinal(t[2]) + ", " +t[0] +
                " @ " + this.clock12(t[3],t[4]);
    },
    month:["January","February","March","April","May","June","July","September","October","November","December"],
    ordinal:function(n) {
        return n+(["th","st","nd","rd"][(( n % 100 / 10) | 0) ===1 ? 0 : n % 10 < 4 ? n % 10 : 0 ]);
    },
    clock12:function(h24,m,s){
        h24%=24;
        var h12 = h24 % 12;
        if (h12===0) h12=12;
        return h12 + ":" +
                (m<10 ? "0" + m : m) +
                (isFinite(s) ? ":" + (s<10?"0"+s:s): "") +
                (h24<12 ? "AM":"PM");
    }
};
