import httpx
import asyncio
import base64
from typing import Dict, Any, Optional
from core.config import settings
from core.logging import get_logger

logger = get_logger()

class JudgeService:
    """
    Service to execute code using Judge0.
    """
    
    # Judge0 Language IDs
    LANG_IDS = {
        "python": 71, # Python 3.8.1
        "javascript": 63, # Node.js 12.14.0
        "cpp": 54, # C++ (GCC 9.2.0)
        "java": 62, # Java (OpenJDK 13.0.1)
    }

    def __init__(self):
        self.api_url = settings.JUDGE0_API_URL
        self.api_key = settings.JUDGE0_API_KEY
        
        if not self.api_key:
            logger.warning("JUDGE0_API_KEY is not set. JudgeService will fail for real execution.")

    async def execute_code(
        self, 
        language: str, 
        code: str, 
        stdin: str = "", 
        expected_output: Optional[str] = None,
        time_limit: float = 2.0,
        memory_limit: int = 128000
    ) -> Dict[str, Any]:
        """
        Executes code and returns the result.
        """
        return await self._execute_judge0(language, code, stdin, expected_output, time_limit, memory_limit)

    async def _execute_judge0(
        self, 
        language: str, 
        code: str, 
        stdin: str, 
        expected_output: Optional[str],
        time_limit: float,
        memory_limit: int
    ) -> Dict[str, Any]:
        
        lang_id = self.LANG_IDS.get(language.lower())
        if not lang_id:
            return {"status": "error", "message": f"Unsupported language: {language}", "verdict": "system_error"}

        payload = {
            "source_code": base64.b64encode(code.encode()).decode(),
            "language_id": lang_id,
            "stdin": base64.b64encode(stdin.encode()).decode() if stdin else "",
            "expected_output": base64.b64encode(expected_output.encode()).decode() if expected_output else None,
            "cpu_time_limit": time_limit,
            "memory_limit": memory_limit,
        }

        headers = {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
        }

        async with httpx.AsyncClient() as client:
            try:
                # Create submission
                response = await client.post(
                    f"{self.api_url}/submissions?base64_encoded=true&wait=true", 
                    json=payload, 
                    headers=headers,
                    timeout=10.0
                )
                
                if response.status_code == 401 or response.status_code == 403:
                     return {"status": "error", "message": "Judge0 API Key Invalid or Quota Exceeded", "verdict": "system_error"}

                response.raise_for_status()
                result = response.json()
                
                # Parse result
                stdout = base64.b64decode(result.get("stdout") or "").decode() if result.get("stdout") else ""
                stderr = base64.b64decode(result.get("stderr") or "").decode() if result.get("stderr") else ""
                compile_output = base64.b64decode(result.get("compile_output") or "").decode() if result.get("compile_output") else ""
                
                status_id = result.get("status", {}).get("id")
                # 3 = Accepted, 4 = WA, 5 = TLE, 6 = Compilation Error, etc.
                
                verdict = "passed" if status_id == 3 else "failed"
                if status_id == 6: verdict = "compilation_error"
                if status_id == 5: verdict = "timeout"
                if status_id >= 7: verdict = "runtime_error"

                # Combine stderr and compile_output for easier display
                error_message = stderr
                if compile_output:
                    error_message = f"Compilation Error:\n{compile_output}\n{stderr}"

                return {
                    "verdict": verdict,
                    "stdout": stdout,
                    "stderr": error_message,
                    "time": result.get("time"),
                    "memory": result.get("memory"),
                    "status_description": result.get("status", {}).get("description"),
                    "token": result.get("token")
                }

            except httpx.TimeoutException:
                return {"status": "error", "message": "Judge0 Request Timed Out", "verdict": "system_error"}
            except Exception as e:
                logger.error(f"Judge0 Error: {e}")
                return {"status": "error", "message": str(e), "verdict": "system_error"}

judge_service = JudgeService()
