// Simple in-memory cache to prevent hitting Twitch API rate limits on every chat message
let cachedMembers = [];
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // Cache team roster for 15 minutes

export default async function handler(req, res) {

  // Clean the username input
  const cleanUser = user ? user.replace("@", "").trim().toLowerCase() : null;
  const teamName = team || process.env.TWITCH_TEAM_NAME;

  if (!cleanUser || !teamName) {
    return res.status(200).send("");
  }

  const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
  const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

  try {
    const now = Date.now();

    // Refresh roster from Twitch API if cache is expired or empty
    if (now - lastFetchTime > CACHE_DURATION || cachedMembers.length === 0) {
      // 1. Get Twitch App Access Token
      const tokenResponse = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
        { method: "POST" }
      );
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // 2. Fetch official Twitch Team roster
      const teamResponse = await fetch(
        `https://api.twitch.tv/helix/teams?name=${encodeURIComponent(teamName)}`,
        {
          headers: {
            "Client-ID": CLIENT_ID,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const teamData = await teamResponse.json();

      if (teamData.data && teamData.data.length > 0) {
        // Extract array of member usernames in lowercase
        cachedMembers = teamData.data[0].users.map((u) => u.user_login.toLowerCase());
        lastFetchTime = now;
      }
    }

    // 3. Check if chatter exists in the dynamically fetched team list
    if (cachedMembers.includes(cleanUser)) {
      return res
        .status(200)
        .send(
          `Shoutout to my Sprout Collective teammate @${cleanUser}! Check out their channel at https://twitch.tv/${cleanUser}`
        );
    }

    // Return empty response so StreamElements stays silent for non-teammates
    return res.status(200).send("");
} catch (error) {
  return res.status(200).send(`DEBUG ERROR: ${error.message}`);
}

  }
}
