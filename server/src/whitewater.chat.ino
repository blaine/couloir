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
#include <WebApp.h>

WifiConnection wifi;
WebApp webApp;

void setup()
{
  neopixelWrite(RGB_BUILTIN, RGB_BRIGHTNESS, RGB_BRIGHTNESS * .5, 0); // Amber
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

  webApp.setup();

  neopixelWrite(RGB_BUILTIN, 0, RGB_BRIGHTNESS / 2, 0); // Green
}

// the loop function runs over and over again forever
void loop()
{
  wifi.loop();
  webApp.loop();
}