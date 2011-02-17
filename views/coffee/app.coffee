puts = (output) ->
  if console? and console.log?
    console.log output
    
ABApp.authorize = (token, username, userid) ->
  ABApp.sharedStorageManager().set 'token', token
  ABApp.sharedStorageManager().set 'username', username
  ABApp.sharedStorageManager().set 'userid', userid
  true
  
ABApp.deauthorize = ->
  ABApp.sharedStorageManager().unset 'token'
  ABApp.sharedStorageManager().unset 'username'
  ABApp.sharedStorageManager().unset 'userid'
  true                                       

Event.onReady ->
  ABApp.behaviors['SubscriptionManager#popstream'] = (instance) ->
    instance
      .addHook 'pullBegin', ->
        instance.element.down('.command a').update("<div class='spinner small' alt='Loading'></div>")
      .addHook 'pullComplete', ->
        instance.element.down('.command a.pull').update("<img src='/images/load_more.png' alt='Load More'/>")
      .addHook 'pull500', ->
        instance.element.down(".command").update("Unable to connect to archive.")
      .addHook 'pulledContent', ->
        instance.getCounter().addClassName('new')
      .pull()

  window.onresize = ABMessageResizer
  window.onscroll = ABMessageResizer
  
  ABApp.stream.client = new Faye.Client('/faye')
  
  ABApp.stream.client.addExtension(MessageIDHandler)
  ABApp.stream.client.addExtension(ClientAuth)
  ABApp.stream.client.addExtension(MentionHandler)
  ABApp.stream.client.addExtension(GroupFilter)             
  ABApp.stream.client.addExtension(Threader)
  
  Event.addBehavior {
    'form.login:submit': (event) ->
      Event.stop event
      el = @down('input[type=text]')
      username = $F(el).toLowerCase()
      ABApp.channels['chat'] = new SubscriptionManager "chat", $('main_stream')
      @fade()
      $$('form.publisher').first().appear()
      window.onbeforeunload = ->
        ABApp.channels['chat'].send("left the chat.")
    'button.local_popup:click, a.local_popup:click': (event) ->
      Event.stop event
      if not this.value?
        value = @readAttribute 'value'
      else
        value = @value
      EUWindowWaker.wake value
    # Publisher for th emain chat channel.
    'form.publisher:submit': (event) ->
      Event.stop event
      el = @down('input[type=text]')
      channel = $$('li.tracker.active').first().readAttribute('data-channel')
      puts channel
      ABApp.channels[channel].send($F(el))
      el.clear()
    '.messages p img:click': (event) ->
      orig = @
      el = @.clone().absolutize()
      Element.clonePosition(el, orig, {setWidth:false, setHeight: false})
      document.body.appendChild(el.setStyle({
        'height':'auto'
        'width':'auto'
        'border':'4px solid #fff'
        '-webkit-box-shadow':'rgba(0,0,0,.15) 0px 2px 4px 1px'
      }))
      orig.morph('opacity:0')
      el.observe('mouseout', (event) ->
        el.fade {duration:.25}
        orig.morph "opacity:1", {duration:.25}
      )
    "input[name='channel[name]']:blur": ->
      value = @value.sub(" ", "-")
      if value.startsWith("/")
        value = value.sub("/","")
      @value = value
    "form:submit": ->
      chan = @down("input[name='channel[name]']")
      if chan?
        value = chan.value.sub(" ", "-")
        if value.startsWith("/")
          value = value.sub("/", "")
        chan.value = value
    ".messages p span.user:click": ->
      $$('form.publisher').first().down("input[type=text]").value = @innerHTML.strip() + " "
      $$('form.publisher').first().down("input[type=text]").focus()
    "li.tracker:click": ->
      channel = @readAttribute('data-channel')
      ABApp.channels[channel].showStreamContainer(this)
    ".command a.pull:click": (event) ->
      Event.stop event
      channel_name = @up('.messages').readAttribute('data-channel')
      ABApp.channels[channel_name].pull()
    ".command a.focus:click": (event) ->
      Event.stop event
      channel_name = @up('.messages').readAttribute("data-channel")
      old_channel_name = $('main_stream').readAttribute("data-channel")
      ABApp.channels[old_channel_name].createTracker().createStreamContainer().addBehavior("popstream")
      ABApp.channels[channel_name].unregisterElements().setStreamContainer($('main_stream'))
      Event.addBehavior.reload()
    ".command a.leave:click": (event) ->
      Event.stop event
      channel_name = @up('.messages').readAttribute('data-channel')
      ABApp.channels[channel_name].cancel()
    "form.remote:submit": (event) ->
      if not @up('.EUWindow')?
        Event.stop event
        $$("##{@identify()} input.from_ls").each (s) ->
          s.value = ABApp.sharedStorageManager().get(s.readAttribute('name'))
        @request {
          onSuccess: (transport) ->
            if @hasClassName('closes')
              @up('.form').fade {duration:.35}
            new ABMessage transport.responseText, {type:'success'}
          onFailure: (transport) ->
            new ABMessages transport.responseText, {type:'error'}
          
        }
    "a.popup:click": (event) ->
      Event.stop event
      euw = new EUWindow()
      euw.insertWithMessage()
      euw.insertFromURL(@readAttribute('href'))
      if @hasClassName('_sender_closes')
        EUWindow.destroyWindow @up('.EUWindow')
    "a.inactive:click": (event) ->
      Event.stop event
    "a[href='/logout']:click": (event) ->
      Event.stop event
      if ABApp.deauthorize()
        window.location.href = '/logout'
    "#loader": ->
      @fade {delay:.3}
    ".page.index": (event) ->
      $$('.nav ul')[0].insert('<li class="command"><a class="local_popup small" href="#" value="channel:join">Add</a></li>')
      ABApp.channels['chat'] = new SubscriptionManager(["chat"])
                                    .aka("<img src='/images/home.png' />")
                                    .createTracker()
                                    .createStreamContainer()
                                    .addBehavior('popstream')
                                    .showStreamContainer()
      # This checks to see if there are any mentions in the mention stream container.
      # If there aren't, it'll run XHR to get all the mentions since the last time
      # the user pulled from this browser. Presently the server does not persist
      # a user's access history, although that is also planned. 
      # 
      #  Create an instance of SubscritionManager to watch for and handle mentions.
      ABApp.channels['mentions/'+ABApp.sharedStorageManager().get('username')] = new SubscriptionManager(['mentions/'+ABApp.sharedStorageManager().get('username')]);
      ABApp.channels['mentions/'+ABApp.sharedStorageManager().get('username')]
              .aka('<img src="/images/mention.png" />')
              # Register a tracker element for the channel.
              .createTracker()
              # This creates an element from an HBS template that handles the streams.
              .createStreamContainer()
              .addBehavior('popstream')
      SubscriptionWaker()
    '.controls .reply:click': (event) ->
      $$('.publisher input')[0].value = "reply[#{$$('.tracker.active')[0].readAttribute('data-channel')}][#{@.up('.message').readAttribute('data-mid')}]"
      $$('.publisher input')[0].focus()
    '#scroll_top:click':(event) ->
      $$('h1')[0].scrollTo()
  }
#  if (ABApp.sharedStorageManager().get('username') != "")
#     ABApp.channels['chat'] = new SubscriptionManager(["chat"]).setStreamContainer($('main_stream'))
#                                                               .addBehavior('popstream'); */                                                              