export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Send a POST request with SSML text.", {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    try {
      const ssml = await request.text();

      if (!env.AZURE_KEY || !env.AZURE_REGION) {
        return new Response(
          "Missing secret: AZURE_KEY or AZURE_REGION is not set on this Worker.",
          { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }

      const azureResponse = await fetch(
        `https://${env.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": env.AZURE_KEY,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
          },
          body: ssml,
        }
      );

      if (!azureResponse.ok) {
        const errorText = await azureResponse.text();
        return new Response(
          `Azure rejected the request (status ${azureResponse.status}): ${errorText || "no details returned"}`,
          { status: 502, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }

      const audio = await azureResponse.arrayBuffer();

      return new Response(audio, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response("Worker error: " + err.message, {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
        
