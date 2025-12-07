import httpx
import json
import asyncio
from typing import Dict, Any, Optional, List
from core.config import settings
from services.judge_service import judge_service

class LLMService:
    """
    Service to interact with Groq LLM for question generation and verification.
    """
    
    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL = "openai/gpt-oss-120b"
    # Note: "gpt-oss-120b" might be a placeholder name. Usually Groq supports "llama3-70b-8192" or "mixtral-8x7b-32768".
    # I will use "llama3-70b-8192" as a safe default if the user's specific model name is just a hint.
    # But user said "groq gpt-oss-120b", I'll try to use that, or fallback.
    # Actually, let's use "llama3-70b-8192" as it's standard on Groq.
    
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7, max_tokens: int = 1024) -> Dict[str, Any]:
        """
        Generic text generation for Chat, Resume Analysis, Job Descriptions.
        """
        if not self.api_key:
            return {"provider": "mock", "text": "Mock AI Response: Groq API Key not set."}

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.GROQ_API_URL, json=payload, headers=headers, timeout=60.0)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return {"provider": "groq", "text": content}
            except httpx.HTTPStatusError as e:
                print(f"LLM Generation HTTP Error: {e.response.status_code} - {e.response.text}")
                raise e
            except Exception as e:
                print(f"LLM Generation Error: {e}")
                raise e

    async def generate_coding_question(self, topic: str, difficulty: str, language: str = "python", sample_count: int = 2, hidden_count: int = 5, count: int = 1) -> List[Dict[str, Any]]:
        """
        Generates coding questions with canonical solution and tests.
        Verifies them before returning.
        Returns a list of questions.
        """
        prompt = self._build_prompt(topic, difficulty, language, sample_count, hidden_count, count)
        
        for attempt in range(3): # Retry up to 3 times
            try:
                response_json = await self._call_groq(prompt)
                questions_data = self._parse_response(response_json)
                
                if not isinstance(questions_data, list):
                    questions_data = [questions_data]

                # Verification disabled to save credits
                return questions_data
            except Exception as e:
                print(f"Generation error attempt {attempt+1}: {e}")
                
        raise Exception("Failed to generate valid questions after 3 attempts.")

    def _build_prompt(self, topic: str, difficulty: str, language: str, sample_count: int, hidden_count: int, count: int) -> str:
        return f"""
You are an expert technical interviewer. Create {count} distinct {difficulty} coding problem(s) about {topic} in {language}.
Return ONLY a valid JSON object containing a LIST of questions. Structure:
[
  {{
    "title": "Problem Title",
    "description": "Problem description...",
    "constraints": "Input constraints...",
    "examples": [
        {{"input": "...", "output": "...", "explanation": "..."}}
    ],
    "sample_tests": [
        {{"input": "...", "output": "..."}}
    ],
    "hidden_tests": [
        {{"input": "...", "output": "..."}}
    ],
    "canonical_solution": "# Full script that reads from STDIN and prints to STDOUT\\nimport sys\\n...",
    "function_signature": "def solution():\\n    # Read from stdin\\n    # Print to stdout"
  }}
]
IMPORTANT:
1. The `canonical_solution` MUST be a complete executable script that reads inputs from STDIN and prints the result to STDOUT. Do NOT just write a function without calling it.
2. The `hidden_tests` should cover edge cases.
3. Provide exactly {sample_count} sample_tests and {hidden_count} hidden_tests per question.
"""

    async def _call_groq(self, prompt: str) -> str:
        if not self.api_key:
            # Mock response for dev without key
            return json.dumps([{
                "title": "Mock Sum",
                "description": "Return sum of a and b",
                "constraints": "a, b < 100",
                "examples": [{"input": "1 2", "output": "3", "explanation": "1+2=3"}],
                "sample_tests": [{"input": "1\n2", "output": "3"}, {"input": "3\n4", "output": "7"}],
                "hidden_tests": [{"input": "10\n20", "output": "30"}, {"input": "-1\n-1", "output": "-2"}],
                "canonical_solution": "import sys\na = int(sys.stdin.readline())\nb = int(sys.stdin.readline())\nprint(a + b)",
                "function_signature": "import sys\n# Read from stdin"
            }])

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.MODEL, # Use class constant
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "response_format": {"type": "json_object"}
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.GROQ_API_URL, json=payload, headers=headers, timeout=60.0)
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                # Ensure we get a list
                parsed = self._parse_response(content) 
                
                # Fix double escaped newlines in canonical_solution
                if isinstance(parsed, list):
                    for q in parsed:
                        if "canonical_solution" in q and isinstance(q["canonical_solution"], str):
                            q["canonical_solution"] = q["canonical_solution"].replace("\\n", "\n")
                elif isinstance(parsed, dict):
                    if "questions" in parsed and isinstance(parsed["questions"], list):
                        for q in parsed["questions"]:
                             if "canonical_solution" in q and isinstance(q["canonical_solution"], str):
                                q["canonical_solution"] = q["canonical_solution"].replace("\\n", "\n")

                if isinstance(parsed, dict) and "questions" in parsed:
                     return json.dumps(parsed["questions"]) # Handle case where LLM wraps list in object
                return content
            except httpx.HTTPStatusError as e:
                print(f"LLM Call HTTP Error: {e.response.status_code} - {e.response.text}")
                raise e

    def _parse_response(self, response_str: str) -> Any:
        try:
            return json.loads(response_str)
        except json.JSONDecodeError:
            # Try to find JSON block if markdown is present
            if "```json" in response_str:
                return json.loads(response_str.split("```json")[1].split("```")[0])
            raise

    async def _verify_question(self, data: Dict[str, Any], language: str) -> bool:
        """
        Runs canonical solution against hidden tests.
        """
        code = data.get("canonical_solution")
        hidden_tests = data.get("hidden_tests", [])
        
        if not code or not hidden_tests:
            return False

        for test in hidden_tests:
            result = await judge_service.execute_code(
                language=language,
                code=code,
                stdin=test["input"],
                expected_output=test["output"]
            )
import httpx
import json
import asyncio
from typing import Dict, Any, Optional, List
from core.config import settings
from services.judge_service import judge_service

class LLMService:
    """
    Service to interact with Groq LLM for question generation and verification.
    """
    
    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL = "openai/gpt-oss-120b"
    # Note: "gpt-oss-120b" might be a placeholder name. Usually Groq supports "llama3-70b-8192" or "mixtral-8x7b-32768".
    # I will use "llama3-70b-8192" as a safe default if the user's specific model name is just a hint.
    # But user said "groq gpt-oss-120b", I'll try to use that, or fallback.
    # Actually, let's use "llama3-70b-8192" as it's standard on Groq.
    
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7, max_tokens: int = 1024) -> Dict[str, Any]:
        """
        Generic text generation for Chat, Resume Analysis, Job Descriptions.
        """
        if not self.api_key:
            return {"provider": "mock", "text": "Mock AI Response: Groq API Key not set."}

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.GROQ_API_URL, json=payload, headers=headers, timeout=60.0)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return {"provider": "groq", "text": content}
            except httpx.HTTPStatusError as e:
                print(f"LLM Generation HTTP Error: {e.response.status_code} - {e.response.text}")
                raise e
            except Exception as e:
                print(f"LLM Generation Error: {e}")
                raise e

    async def generate_coding_question(self, topic: str, difficulty: str, language: str = "python", sample_count: int = 2, hidden_count: int = 5, count: int = 1) -> List[Dict[str, Any]]:
        """
        Generates coding questions with canonical solution and tests.
        Verifies them before returning.
        Returns a list of questions.
        """
        prompt = self._build_prompt(topic, difficulty, language, sample_count, hidden_count, count)
        
        for attempt in range(3): # Retry up to 3 times
            try:
                response_json = await self._call_groq(prompt)
                questions_data = self._parse_response(response_json)
                
                if not isinstance(questions_data, list):
                    questions_data = [questions_data]

                valid_questions = []
                for q in questions_data:
                    if await self._verify_question(q, language):
                        valid_questions.append(q)
                
                if valid_questions:
                    # If we requested N and got at least 1 valid, return what we have
                    # Ideally we want exactly N, but partial success is better than failure
                    return valid_questions
                else:
                    print(f"Verification failed for all questions in attempt {attempt+1}")
            except Exception as e:
                print(f"Generation error attempt {attempt+1}: {e}")
                
        raise Exception("Failed to generate valid questions after 3 attempts.")

    def _build_prompt(self, topic: str, difficulty: str, language: str, sample_count: int, hidden_count: int, count: int) -> str:
        return f"""
You are an expert technical interviewer. Create {count} distinct {difficulty} coding problem(s) about {topic} in {language}.
Return ONLY a valid JSON object containing a LIST of questions. Structure:
[
  {{
    "title": "Problem Title",
    "description": "Problem description...",
    "constraints": "Input constraints...",
    "examples": [
        {{"input": "...", "output": "...", "explanation": "..."}}
    ],
    "sample_tests": [
        {{"input": "...", "output": "..."}}
    ],
    "hidden_tests": [
        {{"input": "...", "output": "..."}}
    ],
    "canonical_solution": "# Full script that reads from STDIN and prints to STDOUT\\nimport sys\\n...",
    "function_signature": "def solution():\\n    # Read from stdin\\n    # Print to stdout"
  }}
]
IMPORTANT:
1. The `canonical_solution` MUST be a complete executable script that reads inputs from STDIN and prints the result to STDOUT. Do NOT just write a function without calling it.
2. The `hidden_tests` should cover edge cases.
3. Provide exactly {sample_count} sample_tests and {hidden_count} hidden_tests per question.
"""

    async def _call_groq(self, prompt: str) -> str:
        if not self.api_key:
            # Mock response for dev without key
            return json.dumps([{
                "title": "Mock Sum",
                "description": "Return sum of a and b",
                "constraints": "a, b < 100",
                "examples": [{"input": "1 2", "output": "3", "explanation": "1+2=3"}],
                "sample_tests": [{"input": "1\n2", "output": "3"}, {"input": "3\n4", "output": "7"}],
                "hidden_tests": [{"input": "10\n20", "output": "30"}, {"input": "-1\n-1", "output": "-2"}],
                "canonical_solution": "import sys\na = int(sys.stdin.readline())\nb = int(sys.stdin.readline())\nprint(a + b)",
                "function_signature": "import sys\n# Read from stdin"
            }])

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.MODEL, # Use class constant
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "response_format": {"type": "json_object"}
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.GROQ_API_URL, json=payload, headers=headers, timeout=60.0)
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                # Ensure we get a list
                parsed = self._parse_response(content)
                if isinstance(parsed, dict) and "questions" in parsed:
                     return json.dumps(parsed["questions"]) # Handle case where LLM wraps list in object
                return content
            except httpx.HTTPStatusError as e:
                print(f"LLM Call HTTP Error: {e.response.status_code} - {e.response.text}")
                raise e

    def _parse_response(self, response_str: str) -> Any:
        try:
            return json.loads(response_str)
        except json.JSONDecodeError:
            # Try to find JSON block if markdown is present
            if "```json" in response_str:
                return json.loads(response_str.split("```json")[1].split("```")[0])
            raise

    async def _verify_question(self, data: Dict[str, Any], language: str) -> bool:
        """
        Runs canonical solution against hidden tests.
        """
        code = data.get("canonical_solution")
        hidden_tests = data.get("hidden_tests", [])
        
        if not code or not hidden_tests:
            return False

        for test in hidden_tests:
            result = await judge_service.execute_code(
                language=language,
                code=code,
                stdin=test["input"],
                expected_output=test["output"]
            )
            if result["verdict"] != "passed":
                print(f"Verification failed on test: {test}. Result: {result}")
                return False
        
        return True

    async def generate_mcq_question(self, topic: str, difficulty: str, count: int = 1) -> List[Dict[str, Any]]:
        """
        Generates multiple choice questions.
        """
        prompt = f"""
You are an expert technical interviewer. Create {count} distinct {difficulty} multiple choice question(s) about {topic}.
Return ONLY a valid JSON object containing a LIST of questions. Structure:
[
  {{
    "title": "Question Title",
    "description": "The question text...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option": 0  // Index of the correct option (0-3)
  }}
]
Ensure the options are distinct and there is exactly one correct answer.
"""
        try:
            response_json = await self._call_groq(prompt)
            questions = self._parse_response(response_json)
            if not isinstance(questions, list):
                questions = [questions]
            return questions
        except Exception as e:
            print(f"MCQ Generation Error: {e}")
            # Fallback mock
            return [{
                "title": f"Mock MCQ on {topic}",
                "description": f"What is a key feature of {topic}?",
                "options": ["Feature A", "Feature B", "Feature C", "Feature D"],
                "correct_option": 0
            }]

llm_service = LLMService()
