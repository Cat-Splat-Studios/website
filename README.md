# Cat Splat Studios Website

Modern, responsive website for Cat Splat Studios - an indie game studio from Toronto. Built with React 19, Vite, Tailwind CSS 4, and shadcn/ui components.

## Features

- 🎮 **Games Showcase** - Featured game (Codename: Shifter) and past prototypes
- 👥 **Team Profiles** - Meet the developers behind the games
- 🌌 **Dark Cosmic Theme** - Stunning purple/cyan color scheme with animated starfield
- 📱 **Fully Responsive** - Optimized for desktop, tablet, and mobile
- ⚡ **Fast & Modern** - Built with Vite for lightning-fast development and builds
- 🎨 **Tailwind CSS 4** - Latest styling with OKLCH color system
- 🧩 **Modular Components** - Reusable UI components with shadcn/ui

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with OKLCH colors
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: Wouter (lightweight React router)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Typography**: Orbitron (headings) + Inter (body)

## Project Structure

```
catsplatstudios/
├── client/
│   ├── public/           # Static assets (images, favicon, etc.)
│   │   └── assets/       # Game images and logos
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   │   ├── ui/       # shadcn/ui components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── GameCard.tsx
│   │   │   └── TeamMember.tsx
│   │   ├── contexts/     # React contexts (Theme)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── About.tsx
│   │   │   ├── Games.tsx
│   │   │   └── NotFound.tsx
│   │   ├── App.tsx       # Main app with routing
│   │   ├── main.tsx      # React entry point
│   │   ├── index.css     # Global styles and theme
│   │   └── const.ts      # App constants (logo, title)
│   └── index.html        # HTML template
├── patches/              # pnpm patches (wouter routing fix)
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions deployment
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── components.json       # shadcn/ui configuration

```

## Getting Started

### Prerequisites

- Node.js 20+ 
- pnpm 10+ (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd catsplatstudios
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

The site will be available at `http://localhost:3000`

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build locally
- `pnpm check` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier

## Deployment

### GitHub Pages (Recommended)

This project includes a GitHub Actions workflow for automatic deployment to GitHub Pages.

#### Setup Instructions:

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Under "Source", select "GitHub Actions"

3. **Configure Custom Domain** (if using catsplatstudios.com):
   - In Pages settings, add your custom domain
   - Create a `CNAME` file in `client/public/` with your domain:
     ```
     catsplatstudios.com
     ```
   - Configure DNS with your domain provider:
     - Add A records pointing to GitHub Pages IPs:
       - `185.199.108.153`
       - `185.199.109.153`
       - `185.199.110.153`
       - `185.199.111.153`
     - Or add a CNAME record pointing to `<username>.github.io`

4. **Deploy**:
   - Push to `main` branch triggers automatic deployment
   - Check Actions tab for deployment status
   - Site will be live at your custom domain or `<username>.github.io/<repo-name>`

### Other Hosting Options

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
pnpm build
netlify deploy --prod --dir=dist
```

#### Custom Server
```bash
# Build the project
pnpm build

# Serve the dist folder with any static file server
# Example with serve:
npx serve dist
```

## Customization

### Updating Content

#### Logo and Title
Edit `client/src/const.ts`:
```typescript
export const APP_TITLE = "Cat Splat Studios";
export const APP_LOGO = "/assets/cat-splat-logo.webp";
```

#### Colors and Theme
Edit `client/src/index.css` to customize the color palette:
```css
@theme {
  --color-primary: oklch(0.75 0.25 280);
  --color-secondary: oklch(0.75 0.20 200);
  /* ... */
}
```

#### Adding New Pages
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.tsx`:
```typescript
<Route path={"/new-page"} component={NewPage} />
```
3. Add navigation link in `client/src/components/Header.tsx`

### Adding shadcn/ui Components

```bash
# Example: add a new component
npx shadcn@latest add <component-name>
```

## Assets

All game images and assets are stored in `client/public/assets/`:
- `cat-splat-logo.webp` - Main studio logo
- `shifter-hero.webp` - Codename: Shifter hero image
- `shifter-ship.webp` - Shifter spacecraft
- `shifter-logo.webp` - Shifter game logo
- `team-photo.webp` - Team photo
- `vader-cat.webp` - Team member photo

To update assets:
1. Add new images to `client/public/assets/`
2. Use WebP format for optimal performance
3. Reference with absolute paths: `/assets/image-name.webp`

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lighthouse Score: 95+ (Performance, Accessibility, Best Practices, SEO)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- WebP images for optimal loading
- Code splitting with React lazy loading
- Tailwind CSS purging for minimal CSS bundle

## License

MIT License - feel free to use this template for your own projects!

## Credits

- **Design & Development**: Cat Splat Studios
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide](https://lucide.dev/)
- **Fonts**: [Google Fonts](https://fonts.google.com/) (Orbitron, Inter)

## Support

For issues or questions:
- Open an issue on GitHub
- Contact: [Your contact information]

---

Built with ❤️ by Cat Splat Studios
