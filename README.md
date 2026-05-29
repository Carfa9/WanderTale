 # WanderTale

  WanderTale är en resejournal där användare kan planera resor, lägga till stopp, skriva minnen och spara bilder från resan. Projektet består av ett .NET API med SQLite-databas och
  en Expo/React Native-app med stöd för webb och lokal offline-lagring.

  ## Funktioner

  - Registrering och inloggning med JWT och refresh tokens
  - Skapa, visa, uppdatera och ta bort resor
  - Lägg till stopp med land, datum, beskrivning och färdsätt
  - Skriv reseinlägg/minnen kopplade till en resa
  - Ladda upp och visa bilder med bildtext, datum och plats
  - Lokal SQLite-lagring i appen
  - Synkkö för offline-ändringar
  - Temastöd med valbara färgteman
  - API-dokumentation via Swagger i utvecklingsläge

  ## Teknik

  ### Backend

  - .NET 9
  - ASP.NET Core Minimal API
  - Entity Framework Core
  - SQLite
  - JWT Bearer Authentication
  - Swagger / OpenAPI
  - xUnit för API-tester

  ### Frontend

  - Expo
  - React Native
  - Expo Router
  - TypeScript
  - React Query
  - Expo SQLite
  - Jest och Testing Library

  ## Projektstruktur

  ```txt
  WanderTale/
  ├── WanderTale.Api/          # Backend/API
  ├── WanderTale.Api.Tests/    # API-tester
  ├── WanderTale.Web/          # Expo/React Native-app
  └── WanderTale.sln           # .NET solution

  ## Förutsättningar

  Installera följande innan du kör projektet:

  - .NET 9 SDK
  - Node.js
  - npm
  - Expo CLI via npx expo
  - Git

  ## Kom igång

  ### 1. Klona projektet

  git clone <repo-url>
  cd WanderTale

  ### 2. Installera frontend-beroenden

  cd WanderTale.Web
  npm install

  ### 3. Skapa miljöfil för frontend

  Kopiera exempel-filen:

  cp .env.example .env

  Sätt API-adressen i .env:

  EXPO_PUBLIC_API_URL=http://localhost:0000

  Om appen körs på en fysisk mobil behöver localhost bytas ut mot datorns lokala IP-adress, till exempel:

  EXPO_PUBLIC_API_URL=http://000.000.0.00:0000

  ### 4. Konfigurera JWT-nyckel för API:t

  API:t kräver en signing key för JWT. Sätt den med user secrets:

  cd ../WanderTale.Api
  dotnet user-secrets set "Jwt:SigningKey" "en-lang-och-saker-hemlig-nyckel-for-utveckling"

  Valfritt kan även issuer och audience sättas:

  dotnet user-secrets set "Jwt:Issuer" "WanderTale"
  dotnet user-secrets set "Jwt:Audience" "WanderTale"

  ### 5. Starta API:t

  Från projektroten:

  dotnet run --project WanderTale.Api

  API:t körs som standard på:

  http://localhost:0000

  I utvecklingsläge finns Swagger här:

  http://localhost:0000/swagger

  Databasen skapas automatiskt som SQLite-fil när API:t startas. Migrationer körs automatiskt vid uppstart.

  ### 6. Starta appen

  I en ny terminal:

  cd WanderTale.Web
  npx expo start --web --port 0000

  Appen öppnas i webbläsaren via Expo. Port 8082 matchar API:ts CORS-inställningar i utvecklingsmiljön.

  ## Tester

  ### Kör API-tester

  Från projektroten:

  dotnet test

  ### Kör frontend-tester

  cd WanderTale.Web
  npm test

  ### Kör lint

  cd WanderTale.Web
  npm run lint

  ## Viktiga kommandon

  ### Backend

  dotnet run --project WanderTale.Api
  dotnet test
  dotnet build

  ### Frontend

  npm install
  npm run web
  npm test
  npm run lint

  ## API-översikt

  API:t innehåller endpoints för:

  - Auth: registrering, inloggning, refresh token, logout och aktuell användare
  - Trips: skapa, hämta, uppdatera och ta bort resor
  - Stops: hantera stopp inom en resa
  - Entries: hantera reseinlägg/minnen
  - Photos: ladda upp, visa och ta bort bilder

  De flesta resurser är användarskyddade och kräver giltig JWT-token.

  ## Lokal data och synkning

  Frontend använder lokal SQLite-lagring för resor, stopp, inlägg och bilder. Ändringar kan sparas lokalt och hanteras via en synkkö, vilket gör att appen kan fortsätta fungera
  även när API:t inte är tillgängligt.

  ## Miljövariabler

  ### Frontend

  EXPO_PUBLIC_API_URL=http://localhost:0000

  ### Backend

  Backend använder konfiguration från appsettings.json, appsettings.Development.json och user secrets.

  Viktig konfiguration:

  {
    "ConnectionStrings": {
      "Default": "Data Source=wanderTale.db"
    },
    "Jwt": {
      "SigningKey": "...",
      "Issuer": "WanderTale",
      "Audience": "WanderTale"
    }
  }

  ## Status

  Projektet är under utveckling och innehåller både API-, app- och testkod för de centrala resejournalfunktionerna.
