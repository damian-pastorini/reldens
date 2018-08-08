# Quest World - Epic Adventure
#### MMORPG

## Servers

Dev environment installation in Vagrant

Vagrant file contents:
 
```bash
Vagrant.configure(2) do |config|
	config.vm.box = "ubuntu/trusty64"
	config.vm.hostname = "questworld"
	config.vm.network "private_network", ip: "192.168.x.x"
	config.vm.synced_folder "./src", "/var/www/questworld"
end
```

In command line use vagrant ssh to login into the VM and then run the following commands:
```bash
$ sudo -i
$ apt-get update 
$ curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
$ apt-get install -y nodejs
$ sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
$ echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
$ apt-get update
$ apt-get install -y mongodb-org
$ cd /var/www/questworld/
$ npm install
```

References:

- [https://nodejs.org/en/download/package-manager/]
- [https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/]

Run the server with:
```bash
$ nodejs app.js
```
