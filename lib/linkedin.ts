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

// ============================================
// Image upload via LinkedIn Assets API
// ============================================

/**
 * Uploads a single base64 image to LinkedIn and returns the asset URN.
 * Uses the registerUpload → binary PUT → asset URN flow.
 */
export async function uploadImageToLinkedIn(
  accessToken: string,
  userId: string,
  base64Data: string
): Promise<string | null> {
  try {
    // 1. Register upload
    const registerResponse = await fetch(`${LINKEDIN_API_BASE}/assets?action=registerUpload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${userId}`,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          }],
        },
      }),
    })

    if (!registerResponse.ok) {
      console.error('LinkedIn registerUpload failed:', await registerResponse.text())
      return null
    }

    const registerData = await registerResponse.json()
    const uploadUrl = registerData?.value?.uploadMechanism?.[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ]?.uploadUrl
    const asset = registerData?.value?.asset

    if (!uploadUrl || !asset) {
      console.error('LinkedIn registerUpload: missing uploadUrl or asset')
      return null
    }

    // 2. Convert base64 to binary
    const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '')
    const binaryStr = atob(base64Clean)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    // 3. Upload binary to LinkedIn CDN
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: bytes.buffer,
    })

    if (!uploadResponse.ok) {
      console.error('LinkedIn image upload PUT failed:', await uploadResponse.text())
      return null
    }

    return asset as string
  } catch (err) {
    console.error('uploadImageToLinkedIn error:', err)
    return null
  }
}

// ============================================
// Publish post (text only or with images)
// ============================================

export async function publishPost(
  accessToken: string,
  userId: string,
  content: string,
  images?: string[]   // base64 strings or URLs
) {
  let mediaAssets: string[] = []

  // Upload images if provided (max 9 per LinkedIn rules)
  if (images && images.length > 0) {
    const uploadResults = await Promise.allSettled(
      images.slice(0, 9).map(img => uploadImageToLinkedIn(accessToken, userId, img))
    )
    mediaAssets = uploadResults
      .filter((r): r is PromiseFulfilledResult<string | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((v): v is string => !!v)
  }

  const hasImages = mediaAssets.length > 0

  const postData = hasImages
    ? {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'IMAGE',
            media: mediaAssets.map(asset => ({
              status: 'READY',
              media: asset,
            })),
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }
    : {
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
