# Agent Notes

- For local install/build/link workflows in this repo, prefer Yarn commands when the user asks to test the CLI locally.
- Use Node 20 first because `package.json` requires `>=20`.
- Recommended local test flow:

```bash
nvm use 20
yarn
yarn run build
yarn link
metorik commands
```

- If `metorik` does not run after linking, verify the active Node version and the linked binary path.
