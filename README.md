# ☕ Cafe Compass

A modern web application for discovering work-friendly cafes with AI-powered review analysis and interactive maps.

## 🚀 Features

- **Interactive Map**: Explore cafes with custom Mapbox integration
- **Work-Focused Filters**: Find cafes based on WiFi, outlets, noise level, and laptop policy
- **AI Review Analysis**: Automated analysis of Google reviews for work-friendliness
- **Real-time Data**: Scrape cafe information and reviews from Google Maps
- **Modern UI**: Built with React, TypeScript, and TailwindCSS

## 🏗️ Project Structure

```
cafeCompass/
├── frontend/          # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── assets/        # Images and static files
│   │   ├── types/         # TypeScript type definitions
│   │   └── data/          # Sample data and utilities
│   └── public/            # Public assets and fonts
├── backend/           # Node.js backend services
│   ├── src/
│   │   ├── services/      # API services (Outscraper, Supabase)
│   │   ├── scripts/       # Data scraping scripts
│   │   └── types/         # Backend type definitions
│   └── README.md          # Backend setup instructions
└── .ENV              # Environment variables
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router Dom** - Client-side routing
- **Mapbox GL JS** - Interactive maps
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **TypeScript** - Type safety
- **Outscraper API** - Google Maps data scraping
- **Supabase** - Database and backend services

### Database
- **PostgreSQL** (via Supabase) - Main database
- **PostGIS** - Geographic data support

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/stse3/cafeCompass.git
cd cafeCompass
```

### 2. Environment Setup

Create or update `.ENV` file in the project root:

```bash
# Supabase
VITE_PUBLIC_SUPABASE_URL=your_supabase_url
VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Mapbox
VITE_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Outscraper (for data scraping)
OUTSCRAPER_API_KEY=your_outscraper_api_key

# App Config
VITE_PUBLIC_APP_URL=http://localhost:3000
VITE_PUBLIC_APP_NAME=Cafe Compass
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Backend Setup (Optional - for data scraping)

```bash
cd backend
npm install
npm run dev
```

See `backend/README.md` for detailed backend setup and usage.

## 🗄️ Database Schema

### Cafes Table
```sql
CREATE TABLE cafes (
  id UUID PRIMARY KEY,
  google_place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Work amenities
  wifi_speed TEXT CHECK (wifi_speed IN ('fast', 'adequate', 'slow')),
  outlet_rating INTEGER CHECK (outlet_rating >= 1 AND outlet_rating <= 5),
  noise_level TEXT CHECK (noise_level IN ('quiet', 'moderate', 'loud')),
  seating_rating INTEGER CHECK (seating_rating >= 1 AND seating_rating <= 5),
  laptop_policy TEXT CHECK (laptop_policy IN ('encouraged', 'allowed', 'discouraged')),
  good_for_calls BOOLEAN DEFAULT FALSE,
  good_for_focus BOOLEAN DEFAULT FALSE,
  remote_work_score INTEGER CHECK (remote_work_score >= 0 AND remote_work_score <= 10),
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_permanently_closed BOOLEAN DEFAULT FALSE,
  needs_ai_reanalysis BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Reviews Table
```sql
CREATE TABLE cafe_reviews (
  id UUID PRIMARY KEY,
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  google_place_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT NOT NULL,
  time BIGINT NOT NULL,
  
  -- AI analysis fields
  mentions_wifi BOOLEAN,
  mentions_outlets BOOLEAN,
  mentions_noise BOOLEAN,
  work_sentiment TEXT CHECK (work_sentiment IN ('positive', 'negative', 'neutral')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 📊 Data Scraping

The backend includes scripts to scrape cafe data from Google Maps using the Outscraper API:

### Scrape Cafe Information
```bash
cd backend
npm run scrape:cafe <GOOGLE_PLACE_ID>
```

### Scrape Reviews Only
```bash
npm run scrape:reviews <GOOGLE_PLACE_ID> <CAFE_ID>
```

See `backend/README.md` for detailed scraping instructions and examples.

## 🎨 UI Components

### Map Features
- **Interactive Markers**: Color-coded by work score
- **Popup Details**: Cafe information on marker click
- **Filtering**: Filter cafes by amenities and ratings
- **Custom Styling**: Custom Mapbox style for optimal UX

### Work Score Legend
- 🟢 **Green (8-10)**: Excellent for remote work
- 🟡 **Yellow (6-7)**: Good for remote work
- 🟠 **Orange (4-5)**: Fair for remote work
- 🔴 **Red (0-3)**: Poor for remote work

## 🔧 Development

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # TypeScript type checking
```

### Backend Development
```bash
cd backend
npm run dev          # Start backend services
npm run build        # Build TypeScript
npm run type-check   # TypeScript type checking
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables in your hosting platform

### Backend (Railway/Heroku)
1. Deploy the backend service
2. Set up environment variables
3. Run database migrations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Mapbox** for interactive mapping
- **Outscraper** for Google Maps data access
- **Supabase** for backend infrastructure
- **Tailwind CSS** for styling system
- **React** ecosystem for frontend framework

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in each service folder
- Review the setup instructions in README files

---

Made with ☕ and ❤️ by [stse3](https://github.com/stse3)