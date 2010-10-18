EUWindowArchive = {
	'channel:create' : {
		template: "<div class='widget mod'><form action='/channel/create' class='via_publisher'><h2>Create a Channel</h2><input type='text' name='channel[name]' placeholder='Channel Name (red, purple, yellow)' /><input type='text' name='channel[allowed_users]' placeholder='Allowed Users (@jon, @susan, @smith)' /><p class='action_bar'><input type='submit' value='Submit'/><input type='button' class='button-nevermind' value='Nevermind' /></p></form></div>",
		options: {
			onSubmit: function(event){
				Event.stop(event);
				this.element.setStyle("opacity: .5");
			}
		}
	},
	'channel:join' : {
		template: "<div class='widget mod'><form action='/channel/join' class='via_publisher'><h2>Join a Channel</h2><input type='text' name='channel[name]' placeholder='Channel Name (red, purple, yellow)' /><p class='action_bar'><input type='submit' value='Join'/><input type='button' class='button-nevermind' value='Nevermind' /></p></form></div>",
		options: {
			onSubmit: function(event){
				Event.stop(event); 
				var el = event.findElement('form');
				var div = new Element('div', {'class':'messages'});
				$('secondary_streams').insert(div);
				var channel = el.down("input[type=text]").value;
				ABApp.channels[channel] = new SubscriptionManager([channel], div);
				EUWindow.destroyWindow(el.up(".EUWindow"));
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
	}, 100);
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