# ## StorageManager              
# Aids in interacting with the HTML5 localStorage API.
class StorageManager

  ## Returns the data associated with a key or `false` of no data exists.
  constructor: (args) ->
    # body...
  get: (key) ->
    data = localStorage.getItem key
    if (data? && data != "") then data else false
  # Sets data to a key in localStorage or overwrites it if it exists. Returns the set value to act chainable.
  set: (key, value) ->
    localStorage.SetItem(key,value)
    value
  unset: (key) ->
    localStorage.removeItem(key)
    null  

# ## SubscriptionWaker
# Recalls channels from values persisted in localStorage and creates managers and elements.
SubscriptionWaker = ->
  memory = ABApp.sharedStorageManager().get 'channels:remembered'
  if memory?
    for sub in memory
      ABApp.channels[sub] = new SubscriptionManager([s]).createTracker()
                                                        .createStreamContainer()
                                                        .pull
                                                       
  true

# ## SubscriptionManager
#  Provides easy access to subscriptions and a facility for the storage and execution of callbacks.
class SubscriptionManager
  # * channels: an _Array_ of channel names without the initial slashes.
  # * element (optional): an _Element_ for the messages to be inserted into.
  constructor: (@channels, @element, force) ->
    unless ABApp.channels[channels[0]]?
      false
    @hooks = {}
    @last_xhr_timestamp = false
    if @element?
      @element.writeAttrbiute('data-channel', channels[0])
    @subscriptions = for channel in @channels
      ABApp.stream.client.subscribe("/#{channel}", (message)->
        @receive(message);
      )
    this

  forget: ->
    memory = ABApp.sharedStorageManager().get 'channels:remembered'
    if memory?
      ABApp.sharedStorageManager.set('channels:remembered', memory.split(",").without(@channels[0]).join(','))
    this
  remember: ->
    memory = ABApp.sharedStorageManager().get 'channels:remembered'
    if memory?
      memory = memory.split(',')
      unless memory.include(@channels[0])
        ABApp.sharedStorageManager().set('channels:remembered', memory.push(@channels[0]).join(','))
    else 
      ABApp.sharedStorageManager().set('channels:remembered', @channels.join(','))
    this
  swapStreamContainers: (subs) ->
    # Removed.
  setStreamContainer: (element) ->
    content = if @element then @element.innerHTML else false
    @element ||= element
    @element.writeAttribute('data-channel', @channels[0])  
    if content?
      @element.update content
    this      

  # Creates an `Element` from a template and readys it for use with a stream.   
  createStreamContainer: (options) ->
    data = {}
    data.contents = @element.innerHTML if @element?
    data.channel = @channels[0]
    @element = EUTemplateWaker.wake 'stream_container', data
    this
  showStreamContainer: (sender) ->
    sender ||= this.tracker
    $$('.popup_stream').without(@element).invoke('hide')
    $$('li.tracker').without(sender).invoke('removeClassName','active')    
    button.toggleClassName('active')
    button.down('count').update('').removeClassName('new')             
    this
  # Add a function to `SubscriptionManager` to call at a given point.
  # Hooks include:                                                       
  # * `pullComplete` called after a `pull` operation is completed. 
  # * `pullSuccess` called after a _successful_ `pull` operation.
  # * `pullBegin` called when a `pull` begins.
  # * `pulledContent` after a `pull` has updated content. 
  addHook: (name, callback) ->
    @hooks[name] = callback
    this
  getHook: (name) ->
    if @hooks[name]? @hooks[name] else (->)
  createTracker: ->
    tracker = new Element('li').update(this.getName() + " <span class='count'></span>")
    $$('.nav ul').first().insert(tracker)
    @registerTracker(tracker)
    this
  # Registers an element to track incoming messages.
  # If the element has a `.count` child, it will be registered
  # as the channel's counter.               
  registerTracker: (element) ->
    @tracker = element
    @tracker.writeAttribute('data-channel', @channels[0])
    if @tracker.down('.count')
      this.registerTracker(@tracker.down('.count'))
    if @tracker.hasClassName('tracker')
      @tracker.addClassName('tracker')
    this
  unregisterTracker: () ->
    if @tracker
      @tracker.removeAttribute('data-channel')
      @counter = undefined      
      @tracker.fade().remove()
      @tracker = undefined
    this
  unregisterStreamContainer: ->
    if @element
      @element.removeAttribute('data-channel')
      @element.fade().remove()
      @element = undefined
    this
  unregisterElements: ->
    this.unregisterTracker().unregisterStreamContainer()
  registerCounter: (@counter) ->
    this
  updateCounter: (value) ->
    if @counter?
      @counter.update(value)
    this
  getCounter: ->
    if @counter? then @counter else false
  incrementCounter: ->
    if @counter?     
      count = parseInt(counter.innerHTML) || 0
      count++
      @counter.update(count)
    this
  highlightCounter: ->
    if @counter?
      @counter.addClassName('new')
    this
  
  # Uses XHR to pull messages from the server, optionally updating the counter and stream element if they exist.
  pull: (options) ->
    date = ABApp.sharedStorageManager.get("channel:#{@channels[0].sub('/','_',5)}:pull")
    this.getHook('pullBegin').bind(this)()
    
    new Ajax.Request("/archive/#{@channels[0]}", {
      method: 'get',

      # If date != false, the server will return only the posts created
      # since the date — if there are none, the server will fall back 
      # to pagination and return the first set of posts. 
      parameters: {
        since: date
        before: @last_xhr_timestamp
        api_user_id: ABApp.sharedStorageManager().get('userid')
        api_user_key: ABApp.sharedStorageManager().get('token')
      }
      onSuccess: (transport) =>
        data = transport.responseText.evalJSON().reverse()

        # If this manager hasn't performed an XHR pull before, then
        # it will just receive the posts like normal, and note the timestamp
        # of the earliest post it got.   
        if data.size() == 0
          @element.down('.command .pull').update('No more messages.').removeClassName('pull').addClassName('inactive')

        if not @last_xhr_timestamp
          @last_xhr_timestamp = data[0].created_at
          data.each (message) =>
            @receive(message)

        # If the manager _has_ done an XHR pull then it will receive the posts
        # alerting the user, and insert them at the bottom of the streamContainer.
        # This should be methodized.                                              
        else
          data.each (message) =>
            @last_xhr_timestamp = message.created_at
            @receive_backwards(message)

        ndate = new Date()
        ABApp.sharedStorageManager().set("channel:#{self.channels[0].sub('/','_',5)}:pull", ndate.toString());

        if data.size() > 0
          @getHook('onContentInserted').bind(this, transport)();

        @getHook('pulledContent').bind(this,transport)();
      on403: (transport) =>
        @subscriptions.invoke('cancel')
        @unregisterElements()
      on500: @getHook('pull500').bind(this)
      onComplete: @getHook('pullComplete').bind(this)
    })                                               
    this
  # Stop receiving messages on this channel. 
  # Also calls `forget`, `unregisterElements`, `Subscription#cancel` 
  # and sends an ABMessage to the user.
  cancel: ->
    @forget()
    @unregisterElements()
    new ABMessage("You&rsquo;ve left #{this.channels[0]}.")
    @subscriptions.invoke('cancel')
  getUsername: ->
    ABApp.sharedStorageManager().get('username')
  receive: (message, options) ->
    options ||= {}
    date = ABApp.sharedStorageManager().get("channel:#{this.channels[0].sub('/','_',5)}:pull");
       
    if @element?
      el = new Element('div').addClassName('message').writeAttribute((if message._id? then message._id else message.id))
      if message.created_at?
        if message.persists is not "false"
          el.addClassName('persists-false')
        if message.invitation?
          el.addClassName('invitation')
          el.writeAttribute('data-channel', message.invitation)
        if message.username is not @getUsername
          @highlightCounter
          @incrementCounter
      else
        created = ISODate.convert message.created_at
        old_date = new Date(date)
        if created > old_date && message.username is not @getUsername
          @highlightCounter
          @incrementCounter 
      formatted_date = if message.created_at? then ISODate.convert(message.created_at).strftime("%l:%M%P") else ""
      el.update("""
      <ul class='meta'>
        <li class='user'>#{message.username}</li>
        <li class='timestamp'>#{formatted_date}</li>
      </ul>
      <p class='text'>#{message.text}</p>
      <p class='controls'>
        <input type='image' src='/images/reply.png' class='reply'/>          
        <span class='count'></span></p>
      """).hide()
      if message.reply?
        p = $$("div[data-mid='#{message.reply}']")
        if p?
          p.insert({after: el.addClassName('reply').appear({engine:'javascript'})})
           .addClassName('has_replies')
          counter = p.down('.count')
          counter.update((parseInt(counter.innerHTML) || 0) + 1)
        else
          opts = {}
          opts[(if options.backwards? then "bottom" else "top")] = el.appear({engine:'javascript'})
          @element.insert(opts)                                     
        Event.addBehavior.reload.defer()
    this                                
  # Please use `#receive(message, {backwards: true})` instead
  receive_backwards: (message) ->
    @receive(message, {backwards: true})
  send: (message) ->
    ABApp.stradm.client.publish("/#{@channels[0]}", {
      text: message,
      username: @getUsername
    })
  aka: (@alias) ->
    this
  getName: ->
    if @alias? then @alias else @channels[0]
  # Redo this.
  addBehavior: (behavior) ->
    if ABApp.behaviors["SubscriptionManager##{name}"]?
      behavior = ABApp.behaviors["SubscriptionManager##{name}"].bind(this)()
      this
    else
		  throw("SubscriptionManager#addBehavior(#{behavior}) that behavior is not available.");
		  false
 
# ## FragmentManager
# Helps manage url fragments for applications using client-side views.

class FragmentManager

  constructor: (lurl, defaults, @callback) ->
    if location.hash in ["", "#"]
      @value = window.location.hash
    @template = new Template(lurl)
    @parts = $H(defaults)
    if typeof @callback isnt 'function'
      @callback = (-> this)
    @setupChecker()
  setupChecker: ->
    @checker = new PeriodicalExecuter(@_checker, 0.5)
    this
  _checker: =>
    unless location.hash in ["##{@value}", @value]
      @stop()
      @updateHash().callback().setupChecker()
  set: (key,value)->
    @parts.set(key,value)
    this
  updateHash: ->
    if @value?
      window.location.hash = @value
    else
      @value = window.location.hash.substring(1)
    this
  update: (@value) ->
    this
  render: ->
    @update(@template.evaluate(@parts.toTemplateReplacements()))
    this                                                        
             
# ## WindowManager
# Manages a collection of _EUWindow_ instances and controls their z-order.
class WindowManager

  constructor: ->
    @pool = $H()
    @EUWMProxyCount = 100
    if not $('app_element')
      @element = new Element('div', {'id':'app_element'})
      document.body.appendChild(@element)
    else
      @element = $('app_element')
  add: (instance) ->
    key = ABApp.generate_uuid()
    @pool.set(key, instance)
    instance.element.writeAttribute('data-eid', key)
  recall: (element) ->
    id = element.readAttribute('data-eid')
    this.pool.get(id)
  