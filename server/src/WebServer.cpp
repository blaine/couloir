#include <FS.h>
#include <SD.h>
#include <SPIFFS.h>
#include <Crypto.h>
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

String generateSHA256Hash(String input)
{
	SHA256 sha256;
	uint8_t *hash;

	// Allocate memory for the hash (32 bytes)
	hash = (uint8_t *)malloc(32);

	// Update hash with the input data
	sha256.doUpdate((const uint8_t *)input.c_str(), input.length());

	// Finalize the hash
	sha256.doFinal(hash);

	// Convert the hash to a hex string
	String result = "";
	for (int i = 0; i < 32; i++)
	{
		char buf[3];
		sprintf(buf, "%02x", hash[i]);
		result += buf;
	}

	// Free allocated memory
	free(hash);

	return result;
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

	// TODO use the real data here.
	String body = "{ message: 'fake' }";
	String id = generateSHA256Hash(body);

	Serial.println(id);

	File file = SD.open("/" + id, FILE_WRITE);
	if (!file)
	{
		res.sendStatus(500);
		return;
	}

	file.print(body);
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
