ifeq ($(PREFIX),)
	PREFIX := /usr/local
endif

all: server

server:
	@echo Building server
	@npm i; npm run build

clean:
	@rm -r build
	@rm -r node_modules

install:
	mkdir -p $(DESTDIR)$(PREFIX)/share/musette
	cp -r plugins $(DESTDIR)$(PREFIX)/share/musette
	install build/musette.js $(DESTDIR)$(PREFIX)/bin/musette
	mkdir -p $(DESTDIR)$(PREFIX)/etc/musette
	cp settings.yaml.example $(DESTDIR)$(PREFIX)/etc/musette/settings.yaml.example
	@echo Installation complete. Please edit "$(DESTDIR)$(PREFIX)/etc/musette/settings.yaml.example" and rename it to "settings.yaml.example".
	@echo If you wish to run musette as a service, please copy, modify, and install either the rc or systemd script in the scripts subdirectory.

uninstall:
	rm -r $(DESTDIR)$(PREFIX)/share/musette
	rm -r $(DESTDIR)$(PREFIX)/etc/musette
	rm $(DESTDIR)$(PREFIX)/bin/musette
