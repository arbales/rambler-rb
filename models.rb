file_name = File.join(File.dirname(__FILE__), ".", "config", "mongoid.yml")
@settings = YAML.load(ERB.new(File.new(file_name).read).result)

Mongoid.configure do |config|
  config.from_hash(@settings[ENV['RACK_ENV']])
end                      

class Person
  include Mongoid::Document
  include Mongoid::Timestamps
  
  field :username
  field :key
  field :last_seen
end         

class Post
  include Mongoid::Document
  include Mongoid::Timestamps
  field :username
  field :channel
  field :text
end