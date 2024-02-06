#include <FS.h>
#include <SD.h>
#include <SPIFFS.h>
#include <AceSorting.h>
#include "WebServer.h"
#include "fileServer.h"
#include "generateMessageId.h"
#include "logRequest.h"

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

using YieldsFile = std::function<void(File)>;

void forEachFileIn(String path, YieldsFile callback)
{
	File dir = SD.open(path);
	while (File entry = dir.openNextFile())
	{
		callback(entry);
		entry.close();
	}
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
}

void getMessages(Request &req, Response &res)
{
	char ranges[1024];
	req.query("q", ranges, 1024);
	if (strlen(ranges) == 0)
	{
		res.status(400);
		res.print("Invalid query");
		return;
	}

	// count messages
	int count = 0;
	forEachFileIn(
			"/",
			[&count](File entry)
			{ count++; });

	char *etag = req.get("If-Match");

	// If the client is requesting messages but the messages-list they're
	// requesting against doesn't match our current, return a 412, at which point
	// the client can try again with the new messages-list
	if (strlen(etag) == 0 || strcmp(etag, String(count).c_str()) != 0)
	{
		res.status(412);
		res.printf("It looks like your messages-list is out of date. Pass the 'if-match' header with the current messages-list count (got %s, expected %d)", etag, count);
		return;
	}

	// list message IDs
	String ids[count];
	int i = 0;
	forEachFileIn(
			"/",
			[&ids, &i](File entry)
			{
				ids[i] = entry.name();
				i++;
			});

	// sort and return
	ace_sorting::shellSortKnuth(ids, count);

	char *range;
	range = strtok(ranges, ",");
	while (range != NULL)
	{
		int start, end;
		if (sscanf(range, "%d-%d", &start, &end) == 2)
		{
			if (start < 0 || start >= count || end < 0 || end >= count || start > end)
			{
				res.status(400);
				res.print("Invalid range");
				return;
			}

			/*

			this is interesting, copilot just autofilled this and maybe it's the right
			way to do it? but also more complicated and just sending a bunch of newline
			separated messages seems fine?

			// res.status(206);
			// res.set("Content-Range", String(start) + "-" + String(end) + "/" + String(count));
			// res.set("ETag", String(count));
			// res.set("Content-Length", String(end - start + 1));
			// res.flush();
			*/

			for (int i = start; i <= end; i++)
			{
				File file = SD.open("/" + ids[i]);
				while (file.available())
				{
					res.write(file.read());
				}
				file.close();
				res.print("\n");
			}
		}
		else
		{
			res.status(400);
			res.printf("Invalid range encountered: %s", range);
			return;
		}
		range = strtok(NULL, ",");
	}

	res.status(200);
}

void getMessagesList(Request &req, Response &res)
{
	// count messages
	int count = 0;
	forEachFileIn(
			"/",
			[&count](File entry)
			{ count++; });

	// list message IDs
	String ids[count];
	int i = 0;
	forEachFileIn(
			"/",
			[&ids, &i](File entry)
			{
				ids[i] = entry.name();
				i++;
			});

	// sort and return
	ace_sorting::shellSortKnuth(ids, count);
	for (int i = 0; i < count; i++)
	{
		Serial.println(ids[i]);
		res.print(ids[i]);
		// Simulate ids.join("\n") in JavaScript. This is probably silly and we should just
		// have the clients be able to cope with a trailing newline.
		if (i < count - 1)
		{
			res.print("\n");
		}
	}
	res.status(200);
	res.flush();
	res.end();
}

WebServer::WebServer() : app(), server(80) {}

char etag[1024];

void WebServer::setup()
{
	app.header("If-Match", etag, 16);
	app.use(&logRequest);
	app.get("/messages", &getMessages);
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
