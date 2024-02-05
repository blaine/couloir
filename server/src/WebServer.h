#ifndef WEBSERVER_H
#define WEBSERVER_H

#include <aWOT.h>
#include <Wifi.h>

class WebServer
{
public:
	WebServer(); // Constructor
	void setup();
	void loop();

private:
	Application app;
	WiFiServer server;

	static void redirect(Request &req, Response &res);
};

#endif