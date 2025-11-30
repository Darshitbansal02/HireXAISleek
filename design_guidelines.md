# HireXAI Design Guidelines

## Design Philosophy
Create a futuristic minimal interface blended with classic gradient aesthetics. The platform should feel intelligent, interactive, and visually superior to traditional job platforms like Naukri.com.

## Visual Identity

### Color Palette
- **Primary**: Dark Navy, Royal Blue
- **Accent**: Silver-White
- **Treatment**: Glassmorphic panels with gradient overlays

### Typography
- **Font Families**: Inter or Poppins for clarity and modern feel
- **Hierarchy**: Clear distinction between headings, body text, and UI labels

### Layout System
- **Spacing**: Use Tailwind spacing units: 2, 4, 8, 12, 16, 24
- **Containers**: Full-width glass panels with soft shadows and rounded corners
- **Responsive**: Mobile-first approach with seamless breakpoints

## Component Design

### Glassmorphic Elements
- Semi-transparent backgrounds with backdrop blur
- Soft shadows for depth (shadow-lg, shadow-xl)
- Rounded corners (rounded-xl, rounded-2xl)
- Subtle borders with low opacity

### Cards & Panels
- Dashboard cards with glass effect
- Skill badges with gradient backgrounds
- Progress bars with animated fills
- Stats cards with hover lift effects

### Forms & Inputs
- Animated form fields with focus states
- Glass-effect input backgrounds
- Gradient buttons with smooth transitions
- Role-based registration/login forms with social login placeholders

### Navigation
- Sticky header with glass morphism
- Sidebar navigation for dashboards
- Smooth transitions between routes
- Active state indicators

## Animations (Framer Motion)

### Page Transitions
- Fade and slide effects for route changes
- Stagger animations for list items
- Smooth scroll-triggered reveals

### Micro-interactions
- Button hover states with scale and glow
- Card hover lifts
- Loading states with skeleton screens
- Toast notifications for user actions

### Decorative Animations
- Floating icons in hero section
- Animated AI connection illustrations
- Profile completion meter animations
- Progress tracker animations

## Dashboard-Specific Elements

### Candidate Dashboard
- AI Resume Doctor panel with ATS score visualization (circular progress)
- Resume Builder wizard with step indicators
- Job recommendation cards with AI match percentage
- Application tracker with status badges

### Recruiter Dashboard
- AI Semantic Search bar with autocomplete
- Candidate cards showing match scores, skill badges, resume previews
- Job posting form with AI JD Writer toggle
- Interview scheduler calendar view
- Analytics charts (Recharts) for insights

### Admin Dashboard
- Overview stat cards (Total users, recruiters, candidates)
- User management table with CRUD actions
- Analytics charts for hiring trends and skill distribution
- Fairness audit panel with metrics

## Landing Page Structure

### Hero Section
- **Headline**: "Hire Smarter, Not Harder with HireXAI"
- **Visual**: Animated illustration or 3D mockup of AI connecting recruiter ↔ candidate
- **CTAs**: "Start Hiring" (gradient button) / "Find Jobs" (outline button)

### Feature Sections
1. **For Recruiters**: AI talent matching showcase
2. **For Candidates**: Resume doctor & builder preview
3. **For Institutions**: Placement analytics demo
4. **Trust Indicators**: Social proof, metrics, testimonials

### Footer
- Contact information
- Policy links (Privacy, Terms)
- Credits and copyright

## Interactive Features

### AI Chatbox Sidebar
- Floating assistant icon
- Slide-in panel with chat interface
- Context-aware suggestions
- Glass-effect container

### Notification System
- Toast messages for actions (resume upload, job posted, etc.)
- Badge indicators on navigation
- Real-time update animations

### Theme Toggle
- Light/Dark mode switcher in header
- Smooth color transitions
- Persistent user preference

## Icons & Imagery
- **Icons**: Heroicons or Lucide-React throughout
- **Hero Image**: Animated AI/tech illustration showing intelligent recruitment flow
- **Feature Icons**: Large, colorful icons for each feature section
- **Dashboard Icons**: Consistent icon usage in navigation and cards

## Accessibility
- ARIA roles on interactive elements
- Keyboard navigation support
- Focus indicators with gradient rings
- Color contrast compliance (WCAG AA)

## Additional UI Elements
- Profile completion meter (circular or linear progress)
- Gamified badges for activity milestones
- File upload dropzones with drag-and-drop
- Multi-step wizards with progress indicators
- Data tables with sorting and filtering
- Modal overlays with glass effect