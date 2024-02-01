#include "WifiConnection.h"
#include <WiFi.h>
#include <WiFiAP.h>
#include <DNSServer.h>
#include <secrets.h>
#define DNS_PORT 53

WifiConnection::WifiConnection()
{
}

void WifiConnection::setup()
{
  this->dnsServer = dnsServer;

  WiFi.mode(WIFI_STA);
  Serial.print("Attempting Wifi connection to network ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  this->isWifiClient = WiFi.waitForConnectResult() == WL_CONNECTED;

  if (this->isWifiClient)
  {
    Serial.println("Connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("Unable to connect to a known network. Starting Access Point.");
    WiFi.softAP("Whitewater Chat");
    IPAddress ip = WiFi.softAPIP();
    Serial.printf("", "http://%d.%d.%d.%d/", ip[0], ip[1], ip[2], ip[3]);
    dnsServer.start(DNS_PORT, "*", ip);
  }
}

void WifiConnection::loop()
{
  if (!this->isWifiClient)
  {
    dnsServer.processNextRequest();
  }
}
