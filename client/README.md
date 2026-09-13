# Live Trade UI

hello, see my project is of like virtual trading system that fatch live stocks and crypto. market data. i have planned it to make in MERN stack. so in ui part, i want to use only React. and i already have been developed the backend part including authentication and buissness logic with git repo. so how we gonna build the ui part? lets discuss first ...

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Run the full app locally

Start the Express API from the repository root in one terminal:

```sh
npm start
```

Then start the React client from `client/` in a second terminal:

```sh
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`, so the
frontend, authentication, portfolio, trading, and market-data calls use the
same backend automatically. For a separately deployed API, copy
`.env.example` to `.env.local` and set `VITE_API_URL` to its `/api` URL.
