export const config = {
  runtime: "edge",
};

async function fetchPage(username, max_id = "") {
  const url = max_id
    ? `https://www.instagram.com/api/v1/feed/user/${username}/reels_media/?max_id=${max_id}`
    : `https://www.instagram.com/api/v1/feed/user/${username}/reels_media/`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
  });

  if (!res.ok) return null;

  return await res.json();
}

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return new Response(JSON.stringify({ error: "username required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let all = [];
  let next = "";

  for (let i = 0; i < 20; i++) {  
    const data = await fetchPage(username, next);
    if (!data || !data.items) break;

    for (const v of data.items) {
      if (v.media_type === 2 || v.media_type === 1) {  // Reel (video)
        all.push({
          shortcode: v.code,
          url: `https://www.instagram.com/reel/${v.code}/`,
          thumbnail: v.image_versions2?.candidates?.[0]?.url ?? null,
          video: v.video_versions?.[0]?.url ?? null,
          taken_at: v.taken_at,
        });
      }
    }

    if (!data.more_available || !data.next_max_id) break;
    next = data.next_max_id;
    await new Promise(r => setTimeout(r, 300)); // Anti-rate limit
  }

  return new Response(
    JSON.stringify(
      {
        username,
        total: all.length,
        reels: all,
      },
      null,
      2
    ),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
