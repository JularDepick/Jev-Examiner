<div align="center">

# Jev-Examiner

[![Version](https://img.shields.io/badge/Version-0.1.0-green)](https://github.com/JularDepick/Jev-Examiner/tree/v0.1.0)
[![Copyright](https://img.shields.io/badge/Copyright-JularDepick-0066AA)](./COPYRIGHT)
[![License](https://img.shields.io/badge/License-Apache--2.0-yellow)](./LICENSE)

[English] |
[简体中文](./README_zh-CN.md)

</div>

A general-purpose AI content moderation workflow powered by the [TypeSafe/Jev model](https://typesafe.ai).

Jev is TypeSafe's first System One model. It does not generate text; it returns structured answers and probability distributions for a set of typed questions. This project builds a layered moderation flow on that capability: a broad "is this a violation" judgment is decomposed into independent atomic questions evaluated in parallel, combined with weights in code, and routed on confidence.

---

## Features

| Feature | Description |
|:---:|:---:|
| Layered atomic moderation | Decomposes moderation into category, severity, and independent violation dimensions evaluated in one parallel request |
| Weighted composite score | Each dimension is normalized to a 0-1 violation tendency and combined by tunable weights |
| Confidence-based routing | Combines the composite violation score with model confidence to pass, route to human review, or block |
| Scenario presets | Ships with general content moderation and campus mutual-aid presets, ready to use |
| Custom question sets | Callers can supply their own question sets and weight tables to fully override a preset |
| Batch moderation | Submits multiple items concurrently and returns both a summary and per-item results |
| No-auth API | The API server performs no caller authentication; keys are supplied by the caller or configured server-side |
| Direct official API access | The frontend shell can call Jev's official endpoint directly with a key, independent of the backend |
| Visual test shell | A static test page with question-set editing, preset switching, dimension details, and raw responses |

## Quick Start

### Requirements

- Node.js 20 or newer (the server uses built-in `fetch`)

### Start the API server

```
cd src/api
npm start
```

The server listens on `http://localhost:8080` by default. It uses only Node.js built-in modules and requires no third-party dependencies.

To configure a key server-side, set the environment variable before starting:

```
JEV_API_KEY=<your-key> npm start
```

### Use the frontend test shell

The frontend is a static page. Open `src/pages/index.html` directly in a browser, or visit `http://localhost:8080/` after starting the API server to load the same page.

Enter your Jev API key and the content to review, then click "开始审核" to see the verdict, dimension details, and the raw official response. The key lives only in the page's runtime UI state and is never persisted.

The frontend calls the official Jev endpoint directly by default. That endpoint only allows whitelisted origins, so a locally opened page is blocked by the browser's cross-origin policy. Two options: point the API base at the local service `http://localhost:8080/audit` and let it forward the call, or start the browser with cross-origin checks disabled. When forwarding through the local service, the page does not need to share an origin with it.

### Call the moderation endpoint

```
curl -X POST http://localhost:8080/audit \
  -H "Content-Type: application/json" \
  -H "X-Jev-Api-Key: <your-key>" \
  -d '{"content":"Content to review","preset":"general"}'
```

## Directory Structure

```
Jev-Examiner/
├── .github/                        # GitHub workflows
│   └── workflows/                  # Workflow configuration
│       └── deploy-src-pages-as-pages.yml # Deploy src/pages to Pages
├── .gitignore                      # git ignore rules
├── COPYRIGHT                       # Copyright file
├── LICENSE                         # License file
├── README.md                       # README document (English)
├── README_zh-CN.md                 # README document (Simplified Chinese)
├── docs/                           # Project documents
│   └── api/                        # API documents
│       └── audit.md                # Moderation API reference
└── src/                            # Project source code
    ├── README_zh-CN.md             # Source structure notes
    ├── api/                        # API service (Node.js)
    │   ├── app.js                  # Server entry
    │   ├── package.json            # Service metadata
    │   └── include/                # Internal modules
    │       ├── constants.js        # Global constants and design details
    │       ├── jevClient.js        # Jev API client wrapper
    │       ├── questionSets.js     # Question sets and weights
    │       ├── auditEngine.js      # Moderation engine
    │       ├── httpUtils.js        # HTTP utilities
    │       └── router.js           # Route handling
    └── pages/                      # Static web test shell
        ├── index.html              # Test shell page
        ├── styles.css              # Page styles
        └── app.js                  # Frontend logic
```

## Documentation

- [API reference](docs/api/audit.md)
- [Jev official docs](https://docs.typesafe.ai/)

## Copyright

Copyright &copy; 2026 JularDepick

See [COPYRIGHT](./COPYRIGHT) for details.

## License

This repository is licensed under the [Apache-2.0 License](./LICENSE).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.
