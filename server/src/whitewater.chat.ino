#include <aWOT.h>
#include <Wifi.h>

// Currently the Arduino IDE doesn't support SPIFFS uploading to the ESP flash, but the following commands work, assuming the 8 MB w/SPIFFS partition scheme:
// ~/Library/Arduino15/packages/esp32/tools/mkspiffs/0.2.3/mkspiffs -c data -b 4096 -p 256 -s 0x180000 spiffs_image.bin
// ~/Library/Arduino15/packages/esp32/tools/esptool_py/4.6/esptool --chip esp32c6 --port /dev/cu.usbserial-10 --baud 921600 write_flash -z 0x670000 spiffs_image.bin
// Details for the various partition schemes are in ~/Library/Arduino15/packages/esp32/hardware/esp32/3.0.0-alpha2/tools/partitions/
// and the "Offset" and "Size" values in the above command need to be adjusted appropriately.
#include <SPIFFS.h>
#include <FS.h>
#include <SPI.h>
#include <SD.h>
#include <WifiConnection.h>

#define DNS_PORT 53
// IPAddress apIP(192, 168, 4, 1);

Application app;
WiFiServer server(80);

int hasRead = 0;

char redirectURL[30];
WifiConnection wifi;

void setup()
{
  neopixelWrite(RGB_BUILTIN, RGB_BRIGHTNESS, RGB_BRIGHTNESS * .75, 0); // Amber
  Serial.begin(115200);
  while (!Serial)
  {
    delay(10); // wait for serial port to connect.
  }
  wifi.setup();

  /*
  10 - Green  - SS
  11 - Blue   - MOSI
  12 - Yellow - SCK
  13 - Orange - MISO
  */
  SPIFFS.begin();
  Serial.printf("Ports:\nMOSI: %d\nMISO: %d\nSCK %d\nSS: %d\n", MOSI, MISO, SCK, SS);
  pinMode(SS, OUTPUT);
  if (!SD.begin(SS))
  {
    Serial.println("Error initializing SD Card");
    return;
  }
  else
  {
    Serial.println("Initialized SD card");
  }
  File myFile = SD.open("/myfile.txt", FILE_WRITE);
  if (!myFile)
  {
    Serial.println("no file");
  }
  else
  {
    Serial.println("I think I have a file.");
  }
  myFile.println("test! yo");
  myFile.close();

  Serial.println("well, we made it this far...");

  Serial.println("tada");

  app.post("/messages", &handleMessage);
  app.use(&fileServer);
  app.use(&redirect);

  server.begin();

  neopixelWrite(RGB_BUILTIN, 0, RGB_BRIGHTNESS / 2, 0); // Green
}

// the loop function runs over and over again forever
void loop()
{
  wifi.loop();

  if (hasRead == 0)
  {
    Serial.println("When the tough gets going, the tough use print.");
    File readFile = SD.open("/myfile.txt", FILE_READ); // Replace 'test.txt' with your file name

    // Read from the file until there's nothing else in it:
    while (readFile.available())
    {
      Serial.print((char)readFile.read());
    }
    Serial.println("\n");

    // Close the file:
    readFile.close();

    hasRead = 1;
  }

  WiFiClient client = server.available(); // listen for incoming clients
  if (client.connected())
  {
    app.process(&client);
    client.stop();
  }
}

void handleMessage(Request &req, Response &res)
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

void redirect(Request &req, Response &res)
{
  if (!res.statusSent())
  {
    res.set("Location", redirectURL);
    res.sendStatus(302);
  }
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