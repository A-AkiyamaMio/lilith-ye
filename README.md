# Lilith's Night

Static first-screen site for `lilith-ye.vip`, ready to deploy through GitHub -> Cloudflare Pages.

## Deploy

1. Commit this folder to the GitHub repository used by Cloudflare Pages.
2. In Cloudflare Pages, set the build command to empty or `npm test`.
3. Set the output directory to `/` if this folder is the repository root, or to `outputs/lilith-ye-site` if deploying from this workspace structure.

## Demo Login

- Visitor: `visitor` / `lilith`
- Admin demo: `admin` / `moonrose`

These credentials are only for the static prototype. Real visitor account management should be implemented with Cloudflare Functions plus D1 or KV, with hashed passwords and server-side sessions. Do not place production credentials in client-side JavaScript.

## Optional Image Generation

Set API credentials locally before running asset generation. Do not commit real keys.

PowerShell:

```powershell
$env:OPENAI_BASE_URL="https://api-cn.hi-code.cc"
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_IMAGE_MODEL="gpt-image-2"
npm run generate:asset -- "Antique gothic envelope, rose and thorns, red wax seal, no text"
```

The generated file is written to `assets/generated-asset.png`.

## Hidden Admin Layer

After logging in as admin, use the small red point at the lower-right corner to reveal the visitor key demo panel. The logo also has a hidden helper gesture: Shift-click the Lilith mark three times to prefill the admin username.
