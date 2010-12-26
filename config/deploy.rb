#require "bundler/capistrano"
$:.unshift(File.expand_path('./lib', ENV['rvm_path'])) # Add RVM's lib directory to the load path.
require "rvm/capistrano"                  # Load RVM's capistrano plugin.
set :rvm_type, :user
set :rvm_ruby_string, '1.9.2'        # Or whatever env you want it to run in.

set :application, "rambler"
set :user, "austin" # I used root, less problems, but not recommended.
set :scm, :git     
#set :thin, "/home/austin/.rvm/gems/ruby-1.9.2-p0/bin/thin"


# This distinction is necessary if the way you access github locally
# is different from the way your production environment will access it.
# For me it was the case.
set :local_repository, "git@github.com:arbales/rambler.git"
set :repository, "git@github.com:arbales/rambler.git"

set :deploy_to, "/usr/local/WebServer/rambler" # path to app on remote machine
set :deploy_via, :remote_cache # quicker checkouts from github

set :domain, 'cake.417east.com' # your remote machine's domain name goes here
role :app, domain
role :web, domain

set :runner, user
set :admin_runner, runner

namespace :deploy do
  task :start, :roles => [:web, :app] do
    run "cd #{deploy_to}/current && thin -C config/production.yml -R ./config.ru start"
  end

  task :stop, :roles => [:web, :app] do
    run "cd #{deploy_to}/current && thin -C config/production.yml -R ./config.ru stop"
  end

  task :restart, :roles => [:web, :app] do
    deploy.stop
    deploy.start
  end
  
  # This will make sure that Capistrano doesn't try to run rake:migrate (this is not a Rails project!)
  task :cold do
    deploy.update
    deploy.start
  end
end


namespace :uploads do

  desc <<-EOD
    Creates the upload folders unless they exist
    and sets the proper upload permissions.
  EOD
  task :setup, :except => { :no_release => true } do
    dirs = uploads_dirs.map { |d| File.join(shared_path, d) }
    run "#{try_sudo} mkdir -p #{dirs.join(' ')} && #{try_sudo} chmod 775 #{dirs.join(' ')}"
  end

  desc <<-EOD
    [internal] Creates the symlink to uploads shared folder
    for the most recently deployed version.
  EOD
  task :symlink, :except => { :no_release => true } do
    run "rm -rf #{release_path}/public/uploads"
    run "ln -nfs #{shared_path}/uploads #{release_path}/public/uploads"
  end

  desc <<-EOD
    [internal] Computes uploads directory paths
    and registers them in Capistrano environment.
  EOD
  task :register_dirs do
    set :uploads_dirs,    %w(uploads uploads/partners)
    set :shared_children, fetch(:shared_children) + fetch(:uploads_dirs)
  end

  after       "deploy:finalize_update", "uploads:symlink"
  on :start,  "uploads:register_dirs"

end