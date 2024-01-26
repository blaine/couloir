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
	WiFi.begin(ssid1, password1);
	this->isWifiClient = WiFi.waitForConnectResult() == WL_CONNECTED;

	if (!this->isWifiClient)
	{
		WiFi.mode(WIFI_STA);
		WiFi.begin(ssid2, password2);
		this->isWifiClient = WiFi.waitForConnectResult() == WL_CONNECTED;
	}

	if (this->isWifiClient)
	{
		Serial.println("Ready");
		Serial.print("IP address: ");
		Serial.println(WiFi.localIP());
	} else {
		WiFi.softAP("Whitewater Chat");
		IPAddress ip = WiFi.softAPIP();
		sprintf("", "http://%d.%d.%d.%d/", ip[0], ip[1], ip[2], ip[3]);
		dnsServer.start(DNS_PORT, "*", ip);
		this->isWifiServer = true;
	}
}

void WifiConnection::loop()
{
	if (this->isWifiServer)
	{
		dnsServer.processNextRequest();
	}
}
