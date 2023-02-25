# yarr

**yarr** (yet another rss reader) is a web-based feed aggregator which can be used both
as a desktop application and a personal self-hosted server.

It is written in Go with the frontend in Vue.js. The storage is backed by SQLite.

![screenshot](etc/promo.png)

## Why?

 The original repository can be found here - https://github.com/nkanaev/yarr

I really loved using this RSS reader because this was simple to run and had all the functionality I was looking for in an RSS reader, except one. That was to share/add the item to your pocket https://getpocket.com/ account. And the original author didn't want to introduce any 3rd party dependencies https://github.com/nkanaev/yarr/issues/57#issue-864736485 in their version of the application. So I decided to fork it and add that(and maybe a few more) feature to my own fork.

## Installation

The latest prebuilt binaries for Linux/MacOS/Windows are available
[here](https://github.com/mzfr/yarr/releases/latest).

* macos

    > ⚠️ I don't use macos and has never tested any of changes on it so its possible things might break there

  - Download `yarr-*-macos64.zip`, unzip it, place `yarr.app` in `/Applications` folder, [open the app](https://support.apple.com/en-gb/guide/mac-help/mh40616/mac)


* windows

  - Download `yarr-*-windows64.zip`, unzip it, open `yarr.exe`

* linux

  - Download `yarr-*-linux64.zip`, unzip it, place `yarr` in `$HOME/.local/bin`
  - Run [the script](etc/install-linux.sh).

* For **self-hosting**, see `yarr -h` for auth, tls & server configuration flags.
* For building from source code, see [build.md](build.md)

## Enable Pocket Support

If you'd like to use the `Add to Pocket` button on the feeds then you can do so by following the steps mentioned below:

* Create a new Pocket Application
  - https://getpocket.com/developer/apps/new

* Take the `consumer key` and put it in `etc/get-pocket-token.py`
  - https://github.com/mzfr/yarr/blob/master/etc/get-pocket-token.py#L5

* Run the python script
  - You'll need to have python3 installed.

* Once the script runs, it will give you a URL, click on it and authorize the application.
* After the scripts execution stops, you will have a `access_token`.


### Manual Method

If the you don't wanna run the script you can also get the `access_token` manually. For that please follow the steps mentioned [here](https://getpocket.com/developer/docs/authentication)

# Credits

[Feather](http://feathericons.com/) for icons.
