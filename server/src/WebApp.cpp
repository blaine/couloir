#include "WebApp.h"
#include <WiFi.h>
#include <aWOT.h>
#include <SD.h>
#include <SPIFFS.h>

char redirectURL[30];

WebApp::WebApp() : server(80), app()
{
}

void WebApp::setup()
{
	app.post("/messages", &WebApp::handleMessage);
	app.use(&WebApp::fileServer);
	app.use(&WebApp::redirect);
}

void WebApp::loop()
{
	WiFiClient client = server.available(); // listen for incoming clients
	if (client.connected())
	{
		app.process(&client);
		client.stop();
	}
}

void WebApp::handleMessage(Request &req, Response &res)
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

String getContentType(String filename)
{
	if (filename.endsWith(".htm"))
		return "text/html";
	else if (filename.endsWith(".html"))
		return "text/html";
	else if (filename.endsWith(".css"))
		return "text/css";
	else if (filename.endsWith(".js"))
		return "application/javascript";
	else if (filename.endsWith(".png"))
		return "image/png";
	else if (filename.endsWith(".gif"))
		return "image/gif";
	else if (filename.endsWith(".jpg"))
		return "image/jpeg";
	else if (filename.endsWith(".ico"))
		return "image/x-icon";
	else if (filename.endsWith(".xml"))
		return "text/xml";
	else if (filename.endsWith(".mp4"))
		return "video/mp4";
	else if (filename.endsWith(".pdf"))
		return "application/x-pdf";
	else if (filename.endsWith(".zip"))
		return "application/x-zip";
	else if (filename.endsWith(".gz"))
		return "application/x-gzip";
	return "text/plain";
}

void WebApp::redirect(Request &req, Response &res)
{
	if (!res.statusSent())
	{
		res.set("Location", redirectURL);
		res.sendStatus(302);
	}
}

void WebApp::fileServer(Request &req, Response &res)
{

	if (req.method() != Request::GET)
	{
		return;
	}

	String path = req.path();
	if (path.endsWith("/"))
		path += "index.html";

	if (SPIFFS.exists(path + ".gz"))
		path += ".gz";

	if (!SPIFFS.exists(path))
	{
		return;
	}

	File file = SPIFFS.open(path);

	if (file.isDirectory())
	{
		return;
	}

	String fileName = file.name();
	if (fileName.endsWith(".gz"))
	{
		res.set("Content-Encoding", "gzip");
		fileName.remove(fileName.length() - 3, 3);
	}
	String mimeType = getContentType(fileName);
	res.set("Content-Type", mimeType.c_str());

	res.status(200);

	while (file.available())
	{
		res.write(file.read());
	}

	res.end();
}