import subprocess
import os
import signal
import sys
import time
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, Response
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

EXPRESS_PORT = os.environ.get("EXPRESS_PORT", "5000")
EXPRESS_URL = f"http://127.0.0.1:{EXPRESS_PORT}"
express_process = None

def start_express():
    global express_process
    env = {
        **os.environ,
        "DATABASE_URL": os.environ.get("DATABASE_URL", "postgresql://sportmax:sportmax123@localhost:5432/sportmax_pro"),
        "SESSION_SECRET": os.environ.get("SESSION_SECRET", "clave_secreta_muy_larga_y_segura_minimo_32_caracteres_para_session"),
        "REPL_ID": os.environ.get("REPL_ID", "test_repl"),
        "ISSUER_URL": os.environ.get("ISSUER_URL", "https://replit.com/oidc"),
        "REPLIT_DOMAINS": os.environ.get("REPLIT_DOMAINS", "localhost"),
        "NODE_ENV": "development",
        "PORT": EXPRESS_PORT,
        "CORS_ORIGIN": os.environ.get("CORS_ORIGIN", "http://localhost:3000,http://localhost:8001"),
    }
    express_process = subprocess.Popen(
        ["npx", "tsx", "server/index.ts"],
        cwd="/app",
        env=env,
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    print(f"Express server started on port {EXPRESS_PORT} (PID: {express_process.pid})")

def stop_express():
    global express_process
    if express_process:
        express_process.terminate()
        try:
            express_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            express_process.kill()
        print("Express server stopped")

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_express()
    # Wait for Express to be ready
    for i in range(30):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{EXPRESS_URL}/api/auth/user", timeout=2.0)
                print(f"Express server ready (attempt {i+1})")
                break
        except Exception:
            time.sleep(1)
    yield
    stop_express()

app = FastAPI(lifespan=lifespan)

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(request: Request, path: str):
    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"{EXPRESS_URL}/{path}"
        
        headers = dict(request.headers)
        headers.pop("host", None)
        
        body = await request.body()
        
        try:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
                params=request.query_params,
                follow_redirects=False,
            )
            
            excluded_headers = {"transfer-encoding", "content-encoding", "content-length"}
            response_headers = {
                k: v for k, v in response.headers.items()
                if k.lower() not in excluded_headers
            }
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=response_headers,
            )
        except httpx.ConnectError:
            return Response(
                content='{"error": "Express server not ready"}',
                status_code=503,
                media_type="application/json",
            )

@app.get("/")
async def root(request: Request):
    return await proxy(request, "")
