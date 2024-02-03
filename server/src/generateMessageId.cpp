#include "generateMessageId.h"
#include <Crypto.h>

String generateMessageId(String input)
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
