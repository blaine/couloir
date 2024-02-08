#include <aWOT.h>

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

	Serial.println(req.path() + String(req.query()));
}