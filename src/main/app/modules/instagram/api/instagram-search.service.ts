import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IgApiClient } from 'instagram-private-api'
import { InstagramLoginService } from './instagram-login.service'
import { InstagramPost, InstagramSearchResult, InstagramUser } from './interfaces/instagram.interface'

// 검색 관련 파라미터 타입 정의
export interface SearchParams {
  keyword: string
  loginUsername?: string
  limit?: number
  headless?: boolean
}

@Injectable()
export class InstagramSearchService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly loginService: InstagramLoginService,
  ) {}

  async search(ig: IgApiClient, params: SearchParams): Promise<InstagramSearchResult> {
    const { keyword, limit = 10 } = params
    try {
      const tagFeed = ig.feed.tags(keyword, 'recent')
      const tagItems = await tagFeed.items()
      const posts: InstagramPost[] = (tagItems.slice(0, limit) || []).map(item => ({
        id: item.id,
        shortcode: item.code,
        displayUrl: item.image_versions2?.candidates?.[0]?.url || '',
        caption: item.caption?.text || '',
        owner: {
          id: item.user.pk.toString(),
          username: item.user.username,
          profilePicUrl: item.user.profile_pic_url,
          isPrivate: item.user.is_private,
          isVerified: item.user.is_verified,
          followersCount: (item.user as any).follower_count ?? undefined,
          followingCount: (item.user as any).following_count ?? undefined,
        },
        likeCount: item.like_count,
        commentCount: item.comment_count,
        timestamp: new Date(item.taken_at * 1000).toISOString(),
      }))
      // 유저 검색
      const userResults = await ig.user.search(keyword)
      const users: InstagramUser[] = (userResults.users.slice(0, limit) || []).map(user => ({
        id: user.pk.toString(),
        username: user.username,
        profilePicUrl: user.profile_pic_url,
        isPrivate: user.is_private,
        isVerified: user.is_verified,
        followersCount: user.follower_count,
        followingCount: (user as any).following_count ?? undefined,
      }))
      return {
        success: true,
        posts,
        users,
        tags: [],
      }
    }
    catch (error) {
      return { success: false, error: error.message, posts: [], users: [], tags: [] }
    }
  }
}
