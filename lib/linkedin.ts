// ============================================
// LinkedIn API Helper Functions
// ============================================

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'

export function getLinkedInAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI!,
    scope: 'openid profile email w_member_social',
    state: 'contentflow_' + Date.now(),
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI!,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  return response.json()
}

export async function getLinkedInProfile(accessToken: string) {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return response.json()
}

export async function publishPost(accessToken: string, userId: string, content: string) {
  const postData = {
    author: `urn:li:person:${userId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to publish post')
  }

  return response.json()
}
