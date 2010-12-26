require 'digest/sha1'
require 'bcrypt'
require 'mongoid'

class Person
  include Mongoid::Document
  include Mongoid::Timestamps

  field :username, :unique => true
  field :key
  field :last_seen, :type => DateTime

  references_many :channels

  def verify(token)
    if (Digest::SHA1.hexdigest(self.key + "salt" + self.username) == token)
      true
    else
      false
    end
  end
end         

class Post
  include Mongoid::Document
  include Mongoid::Timestamps

  field :username
  field :channel
  field :text
end

class Channel
  include Mongoid::Document

  field :name
  field :allowed_users, :type => Array

  referenced_in :person
end