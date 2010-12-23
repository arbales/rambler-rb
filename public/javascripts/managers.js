var FragmentManager, StorageManager, SubscriptionManager, SubscriptionWaker, WindowManager;
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
StorageManager = function() {
  function StorageManager(args) {}
  StorageManager.prototype.get = function(key) {
    var data;
    data = localStorage.getItem(key);
    if ((data != null) && data !== "") {
      return data;
    } else {
      return false;
    }
  };
  StorageManager.prototype.set = function(key, value) {
    localStorage.SetItem(key, value);
    return value;
  };
  StorageManager.prototype.unset = function(key) {
    localStorage.removeItem(key);
    return null;
  };
  return StorageManager;
}();
SubscriptionWaker = function() {
  var memory, sub, _i, _len;
  memory = ABApp.sharedStorageManager().get('channels:remembered');
  if (memory != null) {
    for (_i = 0, _len = memory.length; _i < _len; _i++) {
      sub = memory[_i];
      ABApp.channels[sub] = new SubscriptionManager([s]).createTracker().createStreamContainer().pull;
    }
  }
  return true;
};
SubscriptionManager = function() {
  function SubscriptionManager(channels, element, force) {
    var channel, _fn, _i, _len, _ref, _results;
    this.channels = channels;
    this.element = element;
    if (ABApp.channels[channels[0]] == null) {
      false;
    }
    this.hooks = {};
    this.last_xhr_timestamp = false;
    if (this.element != null) {
      this.element.writeAttrbiute('data-channel', channels[0]);
    }
    this.subscriptions = function() {
      _ref = this.channels;
      _fn = function(channel) {
        return _results.push(ABApp.stream.client.subscribe("/" + channel, function(message) {
          return this.receive(message);
        }));
      };
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        channel = _ref[_i];
        _fn(channel);
      }
      return _results;
    }.call(this);
    this;
  }
  SubscriptionManager.prototype.forget = function() {
    var memory;
    memory = ABApp.sharedStorageManager().get('channels:remembered');
    if (memory != null) {
      ABApp.sharedStorageManager.set('channels:remembered', memory.split(",").without(this.channels[0]).join(','));
    }
    return this;
  };
  SubscriptionManager.prototype.remember = function() {
    var memory;
    memory = ABApp.sharedStorageManager().get('channels:remembered');
    if (memory != null) {
      memory = memory.split(',');
      if (!memory.include(this.channels[0])) {
        ABApp.sharedStorageManager().set('channels:remembered', memory.push(this.channels[0]).join(','));
      }
    } else {
      ABApp.sharedStorageManager().set('channels:remembered', this.channels.join(','));
    }
    return this;
  };
  SubscriptionManager.prototype.swapStreamContainers = function(subs) {};
  SubscriptionManager.prototype.setStreamContainer = function(element) {
    var content;
    content = this.element ? this.element.innerHTML : false;
    this.element || (this.element = element);
    this.element.writeAttribute('data-channel', this.channels[0]);
    if (content != null) {
      this.element.update(content);
    }
    return this;
  };
  SubscriptionManager.prototype.createStreamContainer = function(options) {
    var data;
    data = {};
    if (this.element != null) {
      data.contents = this.element.innerHTML;
    }
    data.channel = this.channels[0];
    this.element = EUTemplateWaker.wake('stream_container', data);
    return this;
  };
  SubscriptionManager.prototype.showStreamContainer = function(sender) {
    sender || (sender = this.tracker);
    $$('.popup_stream').without(this.element).invoke('hide');
    $$('li.tracker').without(sender).invoke('removeClassName', 'active');
    button.toggleClassName('active');
    button.down('count').update('').removeClassName('new');
    return this;
  };
  SubscriptionManager.prototype.addHook = function(name, callback) {
    this.hooks[name] = callback;
    return this;
  };
  SubscriptionManager.prototype.getHook = function(name) {
    var _base;
    if (typeof (_base = this.hooks)[name] === "function" ? _base[name](this.hooks[name]) : void 0) {
      ;
    } else {
      return function() {};
    }
  };
  SubscriptionManager.prototype.createTracker = function() {
    var tracker;
    tracker = new Element('li').update(this.getName() + " <span class='count'></span>");
    $$('.nav ul').first().insert(tracker);
    this.registerTracker(tracker);
    return this;
  };
  SubscriptionManager.prototype.registerTracker = function(element) {
    this.tracker = element;
    this.tracker.writeAttribute('data-channel', this.channels[0]);
    if (this.tracker.down('.count')) {
      this.registerTracker(this.tracker.down('.count'));
    }
    if (this.tracker.hasClassName('tracker')) {
      this.tracker.addClassName('tracker');
    }
    return this;
  };
  SubscriptionManager.prototype.unregisterTracker = function() {
    if (this.tracker) {
      this.tracker.removeAttribute('data-channel');
      this.counter = void 0;
      this.tracker.fade().remove();
      this.tracker = void 0;
    }
    return this;
  };
  SubscriptionManager.prototype.unregisterStreamContainer = function() {
    if (this.element) {
      this.element.removeAttribute('data-channel');
      this.element.fade().remove();
      this.element = void 0;
    }
    return this;
  };
  SubscriptionManager.prototype.unregisterElements = function() {
    return this.unregisterTracker().unregisterStreamContainer();
  };
  SubscriptionManager.prototype.registerCounter = function(counter) {
    this.counter = counter;
    return this;
  };
  SubscriptionManager.prototype.updateCounter = function(value) {
    if (this.counter != null) {
      this.counter.update(value);
    }
    return this;
  };
  SubscriptionManager.prototype.getCounter = function() {
    if (this.counter != null) {
      return this.counter;
    } else {
      return false;
    }
  };
  SubscriptionManager.prototype.incrementCounter = function() {
    var count;
    if (this.counter != null) {
      count = parseInt(counter.innerHTML) || 0;
      count++;
      this.counter.update(count);
    }
    return this;
  };
  SubscriptionManager.prototype.highlightCounter = function() {
    if (this.counter != null) {
      this.counter.addClassName('new');
    }
    return this;
  };
  SubscriptionManager.prototype.pull = function(options) {
    var date;
    date = ABApp.sharedStorageManager.get("channel:" + (this.channels[0].sub('/', '_', 5)) + ":pull");
    this.getHook('pullBegin').bind(this)();
    new Ajax.Request("/archive/" + this.channels[0], {
      method: 'get',
      parameters: {
        since: date,
        before: this.last_xhr_timestamp,
        api_user_id: ABApp.sharedStorageManager().get('userid'),
        api_user_key: ABApp.sharedStorageManager().get('token')
      },
      onSuccess: __bind(function(transport) {
        var data, ndate;
        data = transport.responseText.evalJSON().reverse();
        if (data.size() === 0) {
          this.element.down('.command .pull').update('No more messages.').removeClassName('pull').addClassName('inactive');
        }
        if (!this.last_xhr_timestamp) {
          this.last_xhr_timestamp = data[0].created_at;
          data.each(__bind(function(message) {
            return this.receive(message);
          }, this));
        } else {
          data.each(__bind(function(message) {
            this.last_xhr_timestamp = message.created_at;
            return this.receive_backwards(message);
          }, this));
        }
        ndate = new Date();
        ABApp.sharedStorageManager().set("channel:" + (self.channels[0].sub('/', '_', 5)) + ":pull", ndate.toString());
        if (data.size() > 0) {
          this.getHook('onContentInserted').bind(this, transport)();
        }
        return this.getHook('pulledContent').bind(this, transport)();
      }, this),
      on403: __bind(function(transport) {
        this.subscriptions.invoke('cancel');
        return this.unregisterElements();
      }, this),
      on500: this.getHook('pull500').bind(this),
      onComplete: this.getHook('pullComplete').bind(this)
    });
    return this;
  };
  SubscriptionManager.prototype.cancel = function() {
    this.forget();
    this.unregisterElements();
    new ABMessage("You&rsquo;ve left " + this.channels[0] + ".");
    return this.subscriptions.invoke('cancel');
  };
  SubscriptionManager.prototype.getUsername = function() {
    return ABApp.sharedStorageManager().get('username');
  };
  SubscriptionManager.prototype.receive = function(message, options) {
    var counter, created, date, el, formatted_date, old_date, opts, p;
    options || (options = {});
    date = ABApp.sharedStorageManager().get("channel:" + (this.channels[0].sub('/', '_', 5)) + ":pull");
    if (this.element != null) {
      el = new Element('div').addClassName('message').writeAttribute((message._id != null ? message._id : message.id));
      if (message.created_at != null) {
        if (message.persists === !"false") {
          el.addClassName('persists-false');
        }
        if (message.invitation != null) {
          el.addClassName('invitation');
          el.writeAttribute('data-channel', message.invitation);
        }
        if (message.username === !this.getUsername) {
          this.highlightCounter;
          this.incrementCounter;
        }
      } else {
        created = ISODate.convert(message.created_at);
        old_date = new Date(date);
        if (created > old_date && message.username === !this.getUsername) {
          this.highlightCounter;
          this.incrementCounter;
        }
      }
      formatted_date = message.created_at != null ? ISODate.convert(message.created_at).strftime("%l:%M%P") : "";
      el.update("<ul class='meta'>\n  <li class='user'>" + message.username + "</li>\n  <li class='timestamp'>" + formatted_date + "</li>\n</ul>\n<p class='text'>" + message.text + "</p>\n<p class='controls'>\n  <input type='image' src='/images/reply.png' class='reply'/>          \n  <span class='count'></span></p>").hide();
      if (message.reply != null) {
        p = $$("div[data-mid='" + message.reply + "']");
        if (p != null) {
          p.insert({
            after: el.addClassName('reply').appear({
              engine: 'javascript'
            })
          }).addClassName('has_replies');
          counter = p.down('.count');
          counter.update((parseInt(counter.innerHTML) || 0) + 1);
        } else {
          opts = {};
          opts[(options.backwards != null ? "bottom" : "top")] = el.appear({
            engine: 'javascript'
          });
          this.element.insert(opts);
        }
        Event.addBehavior.reload.defer();
      }
    }
    return this;
  };
  SubscriptionManager.prototype.receive_backwards = function(message) {
    return this.receive(message, {
      backwards: true
    });
  };
  SubscriptionManager.prototype.send = function(message) {
    return ABApp.stradm.client.publish("/" + this.channels[0], {
      text: message,
      username: this.getUsername
    });
  };
  SubscriptionManager.prototype.aka = function(alias) {
    this.alias = alias;
    return this;
  };
  SubscriptionManager.prototype.getName = function() {
    if (this.alias != null) {
      return this.alias;
    } else {
      return this.channels[0];
    }
  };
  SubscriptionManager.prototype.addBehavior = function(behavior) {
    if (ABApp.behaviors["SubscriptionManager#" + name] != null) {
      behavior = ABApp.behaviors["SubscriptionManager#" + name].bind(this)();
      this;
    } else {

    }
    throw "SubscriptionManager#addBehavior(" + behavior + ") that behavior is not available.";
    return false;
  };
  return SubscriptionManager;
}();
FragmentManager = function() {
  function FragmentManager(lurl, defaults, callback) {
    var _ref;
    this.callback = callback;
    this._checker = __bind(this._checker, this);;
    if ((_ref = location.hash) === "" || _ref === "#") {
      this.value = window.location.hash;
    }
    this.template = new Template(lurl);
    this.parts = $H(defaults);
    if (typeof this.callback !== 'function') {
      this.callback = (function() {
        return this;
      });
    }
    this.setupChecker();
  }
  FragmentManager.prototype.setupChecker = function() {
    this.checker = new PeriodicalExecuter(this._checker, 0.5);
    return this;
  };
  FragmentManager.prototype._checker = function() {
    var _ref;
    if ((_ref = location.hash) !== ("#" + this.value) && _ref !== this.value) {
      this.stop();
      return this.updateHash().callback().setupChecker();
    }
  };
  FragmentManager.prototype.set = function(key, value) {
    this.parts.set(key, value);
    return this;
  };
  FragmentManager.prototype.updateHash = function() {
    if (this.value != null) {
      window.location.hash = this.value;
    } else {
      this.value = window.location.hash.substring(1);
    }
    return this;
  };
  FragmentManager.prototype.update = function(value) {
    this.value = value;
    return this;
  };
  FragmentManager.prototype.render = function() {
    this.update(this.template.evaluate(this.parts.toTemplateReplacements()));
    return this;
  };
  return FragmentManager;
}();
WindowManager = function() {
  function WindowManager() {
    this.pool = $H();
    this.EUWMProxyCount = 100;
    if (!$('app_element')) {
      this.element = new Element('div', {
        'id': 'app_element'
      });
      document.body.appendChild(this.element);
    } else {
      this.element = $('app_element');
    }
  }
  WindowManager.prototype.add = function(instance) {
    var key;
    key = ABApp.generate_uuid();
    this.pool.set(key, instance);
    return instance.element.writeAttribute('data-eid', key);
  };
  WindowManager.prototype.recall = function(element) {
    var id;
    id = element.readAttribute('data-eid');
    return this.pool.get(id);
  };
  return WindowManager;
}();