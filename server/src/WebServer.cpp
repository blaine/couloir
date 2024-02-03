#include <FS.h>
#include <SD.h>
#include <SPIFFS.h>
#include "WebServer.h"
#include "fileServer.h"

WebServer::WebServer() : app(), server(80) {}

void WebServer::setup()
{
	app.post("/messages", &WebServer::handleMessage);
	app.use(&fileServer);
	app.use(&WebServer::redirect);
	server.begin();
}

void WebServer::loop()
{
	WiFiClient client = server.available(); // listen for incoming clients
	if (client.connected())
	{
		app.process(&client);
		client.stop();
	}
}

void WebServer::handleMessage(Request &req, Response &res)
{
	char name[8];
	char value[200];

	if (!req.form(name, 8, value, 200))
	{
		Serial.println("well this is a stupid place to fail");
		return res.sendStatus(400);
	}

	Serial.println(name);
	Serial.println(value);

	if (!SD.exists("/chatlog"))
	{
		SD.open("/chatlog", FILE_WRITE).close();
	}

	File file = SD.open("/chatlog", FILE_APPEND);

	if (!file)
	{
		res.sendStatus(500);
		return;
	}

	file.printf("{\"message\": \"%s\"}\n", value);
	file.close();

	res.sendStatus(200);
}

void WebServer::redirect(Request &req, Response &res)
{
	if (!res.statusSent())
	{
		res.set("Location", "/");
		res.sendStatus(302);
	}
}
