Local static server (PowerShell)

This repository includes `serve.ps1`, a lightweight PowerShell static file server using `HttpListener`.

How to run:

Open PowerShell in the project folder and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8000
```

Then open in your browser:

http://localhost:8000

Notes:
- The script uses `HttpListener` and should work on Windows without external dependencies.
- If port 8000 is busy, choose another port with `-Port`.
- For production (HostGator), upload the files to your hosting space and access via the provided domain (no need for this server there).