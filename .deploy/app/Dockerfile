FROM ubuntu:14.04

MAINTAINER Aron van Ammers, aron@outlierventures.io

RUN mkdir -p /var/www/buyco-procurement-data-browser
WORKDIR /var/www/buyco-procurement-data-browser

# Update the image
RUN apt-get update -q && apt-get clean

# Get supporting tools
RUN apt-get install curl git python build-essential -y \
  && (curl https://install.meteor.com/ | sh)

# Copy the source files
ADD ./src /var/www/buyco-procurement-data-browser

# Build the meteor app
RUN cd /var/www/buyco-procurement-data-browser \
  && meteor npm install \
  # Since v1.4.?, Meteor doesn't allow running as root by default. Since we run within a container,
  # root is fine for us. We add `--allow-superuser` to prevent the blocking error message.
  && meteor --allow-superuser build ../buyco-procurement-data-browser-build --directory \

# Install the specific Node version

  && cd /var/www/buyco-procurement-data-browser-build/bundle \
  && bash -c 'curl "https://nodejs.org/dist/$(<.node_version.txt)/node-$(<.node_version.txt)-linux-x64.tar.gz" > /var/www/buyco-procurement-data-browser-build/required-node-linux-x64.tar.gz' \
  && cd /usr/local && tar --strip-components 1 -xzf /var/www/buyco-procurement-data-browser-build/required-node-linux-x64.tar.gz \
  && rm /var/www/buyco-procurement-data-browser-build/required-node-linux-x64.tar.gz \

# Compile npm packages needed for the final build

  && cd /var/www/buyco-procurement-data-browser-build/bundle/programs/server \
  && npm install \

# Cleanup

  && rm /usr/local/bin/meteor \
  && rm -rf ~/.meteor \
  && apt-get --purge autoremove curl git -y

# Install forever for auto-reloading the app in case it fails

RUN npm install -g forever

CMD ["forever", "--minUptime", "1000", "--spinSleepTime", "1000", "/var/www/buyco-procurement-data-browser-build/bundle/main.js"]
