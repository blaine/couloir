#include <FS.h>
#include <SD.h>
#include <SPIFFS.h>
#include "WebServer.h"
#include "fileServer.h"
#include "generateMessageId.h"

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

bool deleteContentsOf(File dir)
{
	bool result = true;
	while (File entry = dir.openNextFile())
	{
		if (entry.isDirectory())
		{
			Serial.println("Deleting directory " + String(entry.path()));
			result = result && deleteContentsOf(entry);
			SD.rmdir(entry.path());
		}
		else
		{
			Serial.println("Deleting file " + String(entry.path()));
			result = result && SD.remove(entry.path());
		}
		entry.close();
	}
	return result;
}

void deleteMessages(Request &req, Response &res)
{
	File dir = SD.open("/");
	if (deleteContentsOf(dir))
	{
		res.status(200);
	}
	else
	{
		res.status(500);
	}
	res.end();
}

void createMessage(Request &req, Response &res)
{
	String message = req.readString();
	String id = generateMessageId(message);

	Serial.println(id);

	File file = SD.open("/" + id, FILE_WRITE);
	if (!file)
	{
		res.sendStatus(500);
		return;
	}

	file.print(message);
	file.close();

	res.status(200);
	res.end();
}

void getMessagesList(Request &req, Response &res)
{
	File dir = SD.open("/");
	while (File entry = dir.openNextFile())
	{
		Serial.print(entry.name());
		res.println(entry.name());
		entry.close();
	}
	// TODO: sort lphabetically
	res.status(200);
	res.end();
}

WebServer::WebServer() : app(), server(80) {}

void WebServer::setup()
{
	app.use(&logRequest);
	app.del("/messages", &deleteMessages);
	app.post("/messages", &createMessage);
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

void WebServer::redirect(Request &req, Response &res)
{
	if (!res.statusSent())
	{
		res.set("Location", "/");
		res.sendStatus(302);
	}
}
