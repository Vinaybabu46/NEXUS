import json
import subprocess
import sys
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

# --- 1. APP CONFIGURATION ---
app = FastAPI(
    title="Nexus Architect API", 
    description="Autonomous Self-Healing Multi-Agent System",
    version="2.1"
)

# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


client = OpenAI(base_url='http://localhost:11434/v1', api_key='ollama')
MODEL_NAME = "qwen2.5-coder:1.5b" 
MAX_RETRIES = 5

# --- 2. DATA MODELS ---
class TaskRequest(BaseModel):
    task: str

class TaskResponse(BaseModel):
    status: str
    final_code: str | None
    logs: list[str]

# --- 3. CORE AGENT FUNCTIONS ---

def run_code_in_sandbox(code_str):
    """
    The Executor: Saves code to a temp file and runs it in a subprocess.
    """
    filename = "temp_solution.py"
    try:
        # Save code to disk
        with open(filename, "w", encoding="utf-8") as f:
            f.write(code_str)

        
        result = subprocess.run(
            [sys.executable, filename],
            capture_output=True, 
            text=True, 
            timeout=60  # <--- CHANGED THIS (Crucial Fix)
        )
        
        if result.returncode == 0:
            return True, result.stdout
        else:
            return False, result.stderr

    except subprocess.TimeoutExpired:
        # --- FIX #2: Better Error Message for Self-Healing ---
        return False, "ERROR: Execution Timed Out (Limit: 60s). You likely have an infinite loop (while True) or a network request hanging. PLEASE ADD A TIMEOUT to your network calls."
    except Exception as e:
        return False, f"System Sandbox Error: {str(e)}"

def agent_coder(task, history):
    """
    The Architect Agent: Writes Python code based on the prompt and feedback.
    """
    system_prompt = (
        "You are an Elite Python Developer. Write production-grade code. "
        "IMPORTANT: Wrap your code in ```python blocks. "
        "CONSTRAINT: Your code must finish running within 60 seconds. "
        "1. Do NOT use infinite loops. "
        "2. If using 'requests', ALWAYS set a timeout (e.g., requests.get(url, timeout=5)). "
        "Do not include conversational text. Just the code."
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Task: {task}"}
    ]
    
    if history:
        for item in history:
            messages.append({"role": "assistant", "content": item['code']})
            if item['type'] == 'security':
                messages.append({"role": "user", "content": f"SECURITY AUDIT FAILED: {item['feedback']}\nFix the vulnerabilities immediately."})
            elif item['type'] == 'runtime':
                messages.append({"role": "user", "content": f"RUNTIME CRASH LOG: {item['feedback']}\nAnalyze the error and rewrite the code to fix it."})

    response = client.chat.completions.create(
        model=MODEL_NAME, messages=messages, temperature=0.6
    )
    
    # Regex Parsing to extract code block
    raw = response.choices[0].message.content
    match = re.search(r"```python(.*?)```", raw, re.DOTALL)
    
    if match:
        return match.group(1).strip()
    else:
        return raw.replace("```python","").replace("```","").strip()

def agent_reviewer(code):
    """
    The Auditor Agent: Checks code for security flaws (OWASP).
    """
    system_prompt = (
        "You are a Senior Security Auditor. Analyze the following Python code for security vulnerabilities "
        "(e.g., SQL Injection, Command Injection, Hardcoded Credentials). "
        "Respond in strict JSON format with two keys: "
        "'status' (must be 'APPROVED' or 'REJECTED') and "
        "'feedback' (a concise reason for rejection). "
        "If the code is safe, output APPROVED."
    )
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt}, 
                {"role": "user", "content": code}
            ],
            response_format={"type": "json_object"}, 
            temperature=0.1
        )
        return json.loads(response.choices[0].message.content)
    except:
        return {"status": "REJECTED", "feedback": "JSON Parsing Error in Auditor Agent."}

# --- 4. THE ORCHESTRATOR ENDPOINT ---

@app.post("/generate", response_model=TaskResponse)
def generate_solution(request: TaskRequest):
    """
    The Orchestrator: Manages the autonomous loop between Agents.
    """
    history = []
    logs = [] 
    
    logs.append(f"🚀 Received Mission: {request.task}")
    
    for attempt in range(MAX_RETRIES):
        logs.append(f"--- Attempt {attempt + 1} ---")
        
        # Step 1: Architect generates code
        code = agent_coder(request.task, history)
        logs.append(" -> Code Generated.")
        
        # Step 2: Auditor checks code
        review = agent_reviewer(code)
        
        if review['status'] != "APPROVED":
            logs.append(f"❌ Security Reject: {review['feedback']}")
            history.append({"code": code, "feedback": review['feedback'], "type": "security"})
            continue 

        # Step 3: Executor runs code
        logs.append("✅ Security Passed. Running code in sandbox...")
        success, output = run_code_in_sandbox(code)
        
        if success:
            logs.append("🚀 SUCCESS: Code ran without errors.")
            logs.append(f"Output: {output.strip()}")
            return TaskResponse(status="SUCCESS", final_code=code, logs=logs)
        else:
            logs.append(f"💥 Runtime Crash: {output.strip()}")
            history.append({"code": code, "feedback": output, "type": "runtime"})

    return TaskResponse(status="FAILED", final_code=None, logs=logs)