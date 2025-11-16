export interface Cafe {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  city: string
  
  // Basic info
  photos: string[]
  hours?: {
    [key: string]: string // "monday": "7:00 AM - 9:00 PM"
  }
  phone?: string
  website?: string
  
  // Ratings (1-5 scale)
  ratings: {
    wifi: number
    outlets: number
    noise: number
    seating: number
    lighting: number
    overall: number
  }
  
  // Reviews
  reviews: Review[]
  reviewCount: number
  
  // Vibes/tags
  vibes: string[]
  goodFor: string[] // "work", "study", "meetings", "dates", "reading"
  
  // Metadata
  createdAt: Date
  updatedAt: Date
}

export interface Review {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  cafeId: string
  
  // Ratings
  ratings: {
    wifi: number
    outlets: number
    noise: number
    seating: number
    lighting: number
    overall: number
  }
  
  // Content
  comment?: string
  photos: string[]
  goodFor: string[]
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  isVerified?: boolean
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  
  // Preferences
  favoriteVibes: string[]
  defaultFilters: SearchFilters
  
  // Social
  friends: string[] // user IDs
  
  // Activity
  checkIns: CheckIn[]
  favoriteCafes: string[] // cafe IDs
  collections: Collection[]
  
  createdAt: Date
  updatedAt: Date
}

export interface CheckIn {
  id: string
  userId: string
  cafeId: string
  cafeName: string
  timestamp: Date
  isPublic: boolean
  note?: string
}

export interface Collection {
  id: string
  name: string
  description?: string
  cafeIds: string[]
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SearchFilters {
  city?: string
  vibes?: string[]
  goodFor?: string[]
  minRating?: number
  openNow?: boolean
  hasWifi?: boolean
  hasOutlets?: boolean
  maxNoise?: number
  sortBy?: 'distance' | 'rating' | 'recent' | 'popular'
}

export interface MapViewport {
  latitude: number
  longitude: number
  zoom: number
}

// Friend-related types for Phase 2
export interface FriendActivity {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  type: 'check-in' | 'review' | 'favorite'
  cafeId: string
  cafeName: string
  timestamp: Date
  data?: any // checkIn, review, etc.
}
