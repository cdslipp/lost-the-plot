# Contributing to StagePlotter

Thank you for your interest in contributing to StagePlotter!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/stageplotter.git`
3. Install dependencies: `bun install`
4. Start the dev server: `bun run dev`

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run checks: `cd app && bun run check` and `bun run lint`
4. Commit with a descriptive message
5. Push and open a pull request

## Code Standards

- **TypeScript** for all new code
- **Svelte 5 runes** syntax (`$state`, `$props`, `$derived`)
- **Tailwind CSS** with semantic color tokens (see `app/src/app.css`)
- Components go in `app/src/lib/components/` and export via `app/src/lib/index.ts`
- Use the existing Prettier/ESLint configuration

## License

By contributing, you agree that your contributions will be licensed under the
AGPL-3.0-only license. See the LICENSE file for details.
