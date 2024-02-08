#include "fileServer.h"
#include <SPIFFS.h>

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

void fileServer(Request &req, Response &res)
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
