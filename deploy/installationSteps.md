# Install MPD if not yet done - configure as needed
# MPD.FM typically works with an out-of-the-box MPD
apt-get update
apt-get install mpd

# Install Git if not yet done
apt-get install git mpd mpc alsa-utils curl build-essential

# install nodejs

## installs nvm (Node Version 20)
curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt-get install -y nodejs

# Download from https://unofficial-builds.nodejs.org/download/release/ the appropriate build for armv6l, example https://unofficial-builds.nodejs.org/download/release/v18.9.1/node-v18.9.1-linux-armv6l.tar.gz
wget https://unofficial-builds.nodejs.org/download/release/v20.9.0/node-v20.9.0-linux-armv6l.tar.gz
tar -xzf node-v20.9.0-linux-armv6l.tar.gz
cd node-v20.9.0-linux-armv6l
sudo cp -R * /usr/local
node -v

# user pi
## 
mkdir mpd;cd mpd;mkdir playlists;mkdir music;touch state;touch tag_cache
cd $HOME;mkdir .config;mkdir .config/mpd;touch .config/mpd/socket


# Create a user to have the server not as root
useradd -mrU srv-mpd

# Access to playlist,music dir
chmod 755 /home/pi

# Sign into the new user
su srv-mpd
cd /home/srv-mpd

sudo adduser 

# Install App
## Download MPD.fm using Git
git clone https://github.com/ThomasK-K/MpdRestApiClient.git

## Install dependencies
cd MpdRestApiClient
npm install
npm build

## Back to root
exit

## Copy systemd service file
cp /home/srv-mpd/myMpdClient/deploy/service/MpdRestApiClient.service /lib/systemd/system/sudo 

ln -s  /lib/systemd/system/MpdRestApiClient.service MpdRestApiClient.service

sudo systemctl daemon-reload

## Ensure MPD.FM starts with boot and run
systemctl enable MpdRestApiClient

systemctl start MpdRestApiClient

journalctl -u MpdRestApiClient.service

## Check status
systemctl status MpdRestApiClient

# install a reverse proxy

## NGINX
```
sudo apt install nginx
sudo systemctl status nginx
cd /etc/nginx/sites-enabled

# cd /etc/nginx/sites-available
# vi myMPDClient.conf 

file: myMPDClient.conf 
server {
              listen 80;
              server_name myMPDClient;
              location / {
                           proxy_pass http://localhost:8000;
                           proxy_http_version 1.1;
                           proxy_set_header Upgrade $http_upgrade;
                           proxy_set_header Connection 'upgrade';
                           proxy_set_header Host $host;
                           proxy_cache_bypass $http_upgrade;
               }
}



ln -s ../sites-available/myMPDClient.conf .
sudo systemctl reload nginx
```


# GIT clone 

## clone

git clone -f  https://oauth2:<token>@github.com/hirschharald/myMpdClient.git

## Update the project

git pull -f   https://oauth2:<token>@github.com/hirschharald/myMpdClient.git

## update projekt

npm run rebuild