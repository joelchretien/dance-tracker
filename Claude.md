# Claude Instructions

## After every git push

Print the SHA-1 hash of the pushed commit so the user can verify deployment.

```
Pushed: <short-hash>
```

## Before making changes

- Run `npm run build` to verify the project compiles
- Run `npm test` to verify tests pass

## After making changes

- Run `npm run build && npm test` before committing
- Push to main — GitHub Actions deploys automatically

## Project conventions

- Pure business logic goes in `src/lib/` with unit tests in `src/__tests__/lib/`
- State management in Pinia stores in `src/stores/`
- UI language refers to "Watched Dancers" (not "my dancers" or "your dancers")
- Protan color-blind accessibility: use shape/pattern/luminance, not just hue
- Mobile-first: all UI designed for iPhone in a dark auditorium
