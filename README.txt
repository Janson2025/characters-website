Project structure

character_sheets/
  index.html
  characters.html
  campaign-notes.html
  styles.css
  app.js
  data/
    party.json
    characters.json
    campaign.json
  images/
    stub-portrait.png

Notes:
- All three pages now use the shared app.js file.
- index.html loads data/party.json
- characters.html loads data/characters.json and respects section visibility flags
- campaign-notes.html loads data/campaign.json

Important:
- Because the pages load JSON with fetch(), some browsers block this when files are opened directly from disk.
- If that happens, run a small local server in the character_sheets folder.
