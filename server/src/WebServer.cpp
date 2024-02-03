#include <FS.h>
#include <SD.h>
#include <SPIFFS.h>
#include "WebServer.h"
#include "fileServer.h"

void logRequest(Request &req, Response &res)
{
	Serial.print(millis());
	Serial.print(": ");

	switch (req.method())
	{
	case Request::GET:
	{
		Serial.print("GET ");
		break;
	}
	case Request::POST:
	{
		Serial.print("POST ");
		break;
	}
	case Request::PUT:
	{
		Serial.print("PUT ");
		break;
	}
	case Request::PATCH:
	{
		Serial.print("GET ");
		break;
	}
	case Request::DELETE:
	{
		Serial.print("DELETE ");
		break;
	}
	default:
	{
	}
	}

	Serial.println(req.path());
}

void deleteMessages(Request &req, Response &res)
{
	// TODO: delete all message files
	res.sendStatus(200);
}

void getMessagesList(Request &req, Response &res)
{
	// TODO: list all message files, sorted alphabetically
	res.print("");
	res.status(200);
	res.end();
}

WebServer::WebServer() : app(), server(80) {}

void WebServer::setup()
{
	app.use(&logRequest);
	app.del("/messages", &deleteMessages);
	app.post("/messages", &WebServer::handleMessage);
	app.get("/messages-list", &getMessagesList);
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

	// TODO: hash the data with sha256 and use that as the filename

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
