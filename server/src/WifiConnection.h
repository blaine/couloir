#ifndef WIFI_CONNECTION_H
#define WIFI_CONNECTION_H
#include <Arduino.h>
#include <DNSServer.h>

class WifiConnection
{
private:
  bool isWifiServer = false;
  bool isWifiClient = false;
  DNSServer dnsServer;

public:
  WifiConnection();
  void setup();
  void loop();
};
#endif