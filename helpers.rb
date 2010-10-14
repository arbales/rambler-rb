def required!(params)
  unless params
    raise ArgumentError, ("Procedure `required` cannot be used in this context. A local variable `params` must be defined."); 
  end
  required = Hash.new {|h,k| 
    raise ArgumentError, ("Attribute #{k} is required.")
    }.update(params)
end
  
helpers do
  register Padrino::Rendering
  register Padrino::Helpers
 
  include Rack::Utils
    alias_method :h, :escape_html

    def secure_url(url)
      if (ENV['RACK_ENV'] == 'production')
        "https://podiumapp.heroku.com#{url}"
      else
        url
      end
    end 
    
    def plain_url(url)
      if (ENV['RACK_ENV'] == 'production')
        "http://podiumapp.heroku.com#{url}"
      else
        url
      end
    end
    
    def abmessage(type, message)
      if !request.xhr?
        flash[type] = message
        redirect back
      else           
        if (type == :success)
          message
        else
          error message
        end
      end
    end
    
    def abmessage_with_redirect(type, message, url)
      if !request.xhr?
        flash[type] = message
        redirect url
      else           
        if (type == :success)
          message
        else
          error message
        end
      end
    end



  def root_url
    request.url.match(/(^.*\/{2}[^\/]*)/)[1]
  end
  
  def static_path
    if (ENV['STATIC_PATH'])
      return ENV['STATIC_PATH']
    elsif (ENV['RACK_ENV'] == 'production')
      return 'http://camero.417east.com/podium'
    else
      return 'http://camero.417east.com/podium'
    end
  end
  
  def flash
    @_flash ||= {}
  end
  def redirect(uri, *args)
    session[:_flash] = flash unless flash.empty?
    status 302
    response['Location'] = uri
    halt(*args)
  end  

end