EUWindowArchive = {
	'channel:create' : {
		template: "<div class='widget full'><form action='/channel/create' class='via_publisher'><h2>Create a Channel</h2><input type='text' name='channel[name]' placeholder='Channel Name (red, purple, yellow)' /><input type='text' name='channel[allowed_users]' placeholder='Allowed Users (@jon, @susan, @smith)' /><p class='action_bar'><input type='submit' value='Submit'/><input type='button' class='button-nevermind' value='Nevermind' /></p></form></div>",
		options: {
			onSubmit: function(event){
				Event.stop(event);
				this.element.setStyle("opacity: .5");
			}
		}
	},
	'channel:sidebar' : {
		template: "<div class='widget full'><form action='/channel/sidebar' class='via_publisher'><h2>Time for a Sidebar?</h2><p>You can invite people to sidebars, but they're also public, it's just like walking off to the side of the room.</p><section><input type='text' name='channel[name]' placeholder='Topic' /><input type='text' name='channel[allowed_users]' placeholder='People to invite (jon, susan, smith)' /></section><p class='action_bar'><input type='button' class='button-nevermind' value='Nevermind' /><input type='submit' value='Start Sidebar'/></p></form></div>",
		options: {
			onSubmit: function(event){
			  Event.stop(event);
			  var el = event.element();
			  var name = el.down("input[name=channel[name]]").value;
        ABApp.channels[name] = new SidebarManager([name]).createTracker().createStreamContainer().remember();
				EUWindow.destroyWindow(el.up(".EUWindow"));
			}
		}
	},
	'channel:join' : {
		template: "<div class='widget full'><form action='/channel/join' class='via_publisher'><h2>Join a Channel</h2><p>Pins a channel to your ramblobar.</p><section><input type='text' name='channel[name]' placeholder='Channel Name (red, purple, yellow)' /></section><p class='action_bar'><input type='button' class='button-nevermind' value='Nevermind' /><input type='submit' value='Join Channel'/></p></form></div>",
		options: {
			onSubmit: function(event){
				Event.stop(event); 
				var el = event.findElement('form');
//				var div = new Element('div', {'class':'messages'});
//				$('secondary_streams').insert(div);
				var channel = el.down("input[type=text]").value;
				
				ABApp.channels[channel] = new SubscriptionManager([channel]);
				EUWindow.destroyWindow(el.up(".EUWindow"));
				
        ABApp.channels[channel]
            // Remember this subscription.
            .remember()
            // Register a tracker element for the channel.
            .createTracker()
            // This creates an element from an HBS template that handles the streams.
            .createStreamContainer()
            // We want to add specific behavior for the beginning of this pull.
            // This stuff should be abstracted into a module, since it applies to any streams with a reload button.
            .addHook('pullBegin', function(){
              this.element.down(".command a").update("Fetching messages&hellip;");})
            .addHook('pullComplete', function(){
              this.element.down(".command a").update("Load More");})
            .addHook('pull500', function(){
              this.element.down(".command").update("Unable to connect to archive.");
            })
            .addHook('pulledContent', function(){
              this.getCounter().addClassName('new');})
            // This pulls content from the stream that was published since the last time we checked. 
            .pull();
				
				
			}
		}
	}
};  

EUTemplateArchive = {
  'stream_container': {
    /*classNames: ['messages', 'popup_stream'],
    type: 'div',
    style: 'display:none',*/
    template: "<div class='messages popup_stream' data-channel='{{channel}}' style='display:none'><p class='command'><a href='/{{channel}}'>Load More</a></p>"
  } 
}     

EUTemplateWaker = {}
EUTemplateWaker.wake = function(name, data){
	var archive = EUTemplateArchive[name]; 
	if (archive === undefined){
	  throw("EUTemplateWaker: no template by name of " + name + " was found");
		return false;
	}
	var compiled_template = function(name){
		if (archive._template===undefined){
			archive._template = Handlebars.compile(archive.template);
		}                                                                                                          
		return archive._template;
	}
	var hbs = function(name, data){
  	return compiled_template(name)(data);
	}                      
	/*var el = new Element(archive.type, {'class':archive.classNames.join(" "), 'style':archive.style});
	document.body.appendChild(el.update(hbs(name, data)));*/
	var el_outer = new Element('div').update(hbs(name, data));
	var el = el_outer.down('div');
	document.body.insert(el);
	setTimeout(function() {
	  Event.addBehavior.reload();
	}, 1);
	return el;
}                       
               
// ## EUWindowWaker
// The EUWindowWaker creates instances of EUWindows from the EUWindowArchive. Uses Handlebars.js

EUWindowWaker = {};
EUWindowWaker.wake = function(name, data){   
	var archive = EUWindowArchive[name]; 
	if (archive === undefined){
		return false;
	}
	var compiled_template = function(name){
		if (archive._template===undefined){
			archive._template = Handlebars.compile(archive.template);
		}                                                                                                          
		return archive._template;
	}
	var hbs = function(name, data){
  	return compiled_template(name)(data);
	}                      
	var _eu = new EUWindow(archive.options);
	output = hbs(name,data);
	return _eu.updateInPlace(output).insert(); 
}


/*var source = "<p>Hello, my name is {{name}}. I am from {{hometown}}. I have " + 
    "{{kids/length}} kids:</p>" +
    "<ul>{{#kids}}<li>{{name}} is {{age}}</li>{{/kids}}</ul>";
var template = Handlebars.compile(source);

var data = { "name": "Alan", "hometown": "Somewhere, TX",
              "kids": [{"name": "Jimmy", "age": "12"}, {"name": "Sally", "age": "4"}]};
var result = template(data);*/