#ifndef WEBAPP_H
#define WEBAPP_H
#include <Arduino.h>
#include <aWOT.h>
#include <WiFi.h>

class WebApp
{
private:
	WiFiServer server;
	Application app;
	static void handleMessage(Request &req, Response &res);
	static void fileServer(Request &req, Response &res);
	static void redirect(Request &req, Response &res);

public:
	WebApp();
	void setup();
	void loop();
};
#endif