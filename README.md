# Musette
Herein lies in-progress code for the server host and server API for Musette,
the NodeJS-based remote music player.

## Running
To run Musette, you will need to also have the [client](https://github.com/kettek/musette-client) project. First download that, extract it, then build it. Then, copy the `settings.yaml.example` file to `settings.yaml` and modify it as you need, pointing `web_root` to the client project's directory.

## Installing
To install Musette as a full system service on *nix platforms, you can use the GNU Makefile in the scripts directory. Simply issue `make -f scripts/Makefile` to build the server, then `make -f scripts/Makefile install` to install it. Per default, it is installed to `/usr/local/`, however this can be overridden by changing the `PREFIX` environment variable.

Once it is installed, you will want to navigate to the `/usr/local/etc/musette' directory, copy the `settings.yaml.example` file to `settings.yaml`, and fit it to your needs. If you are also installing the client portion, you will only need to adjust the `music_root` option to point to your music directory.

### Services
Included in the **scripts** directory are two service files. One for rc and one for systemd. These assume the `/usr/local/` PREFIX, so adjust them as your system needs. The systemd script assumes that the `musette` user exists, so ensure permissions are set for your music directory, or adjust to use a different user.
