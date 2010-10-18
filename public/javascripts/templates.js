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
				var el = event.findElement('.EUWindow');
				var channel = el.down("input[type=text]").value;
				ABApp.channels[channel] = new SubscriptionManager([channel], el);
			}
		}
	}
};                                 
               
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