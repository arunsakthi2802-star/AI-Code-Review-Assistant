import os
import json
import re
import logging
from typing import List, Dict, Any, Tuple
import google.generativeai as genai
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

# Exclude directories
EXCLUDED_DIRS = {
    "node_modules", ".next", ".git", "venv", ".venv", "__pycache__", 
    ".vscode", "dist", "build", "env", "lib", "bin", "obj", "packages"
}

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp", ".c", ".h", 
    ".cs", ".go", ".rs", ".php", ".html", ".css", ".json", ".yaml", ".yml"
}

# Excluded specific files (e.g., lockfiles)
EXCLUDED_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "tsconfig.tsbuildinfo"
}

class CodeAnalyzer:
    @staticmethod
    def read_project_files(project_path: str) -> List[Tuple[str, str]]:
        """
        Recursively reads supported code files from the project directory.
        Returns a list of tuples containing (relative_path, content).
        Caps individual files at 50KB and total size at 600KB.
        """
        code_files = []
        total_size = 0
        max_file_size = 50 * 1024 # 50 KB
        max_total_size = 600 * 1024 # 600 KB

        for root, dirs, files in os.walk(project_path):
            # Exclude directories in-place to prevent os.walk from scanning them
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith(".")]

            for file in files:
                if file in EXCLUDED_FILES or file.startswith("."):
                    continue
                
                ext = os.path.splitext(file)[1].lower()
                if ext not in SUPPORTED_EXTENSIONS:
                    continue

                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, project_path)

                try:
                    file_size = os.path.getsize(abs_path)
                    if file_size > max_file_size:
                        logger.warning(f"Skipping large file {rel_path} ({file_size} bytes)")
                        continue

                    if total_size + file_size > max_total_size:
                        logger.warning(f"Stopping scan: total size limit reached at {rel_path}")
                        break

                    with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        code_files.append((rel_path, content))
                        total_size += file_size

                except Exception as e:
                    logger.error(f"Error reading file {rel_path}: {e}")

            if total_size > max_total_size:
                break

        return code_files

    @classmethod
    def analyze_project(cls, project_path: str) -> Dict[str, Any]:
        """
        Analyzes files in the project path using Gemini, OpenAI, or local regex scanner fallback.
        Returns a dictionary matching the Report model schema.
        """
        files = cls.read_project_files(project_path)
        if not files:
            return {
                "overall_score": 100,
                "summary": "No code files were found in the project directory for analysis.",
                "metrics": {"security": 100, "quality": 100, "performance": 100, "maintainability": 100},
                "issues": []
            }

        # Build context prompt
        context = ""
        for rel_path, content in files:
            context += f"\n--- File: {rel_path} ---\n{content}\n"

        # Attempt Gemini analysis
        if settings.GEMINI_API_KEY:
            try:
                report = cls._analyze_with_gemini(context)
                if report:
                    return report
            except Exception as e:
                logger.error(f"Gemini analysis failed: {e}. Trying OpenAI...")

        # Attempt OpenAI analysis
        if settings.OPENAI_API_KEY:
            try:
                report = cls._analyze_with_openai(context)
                if report:
                    return report
            except Exception as e:
                logger.error(f"OpenAI analysis failed: {e}. Falling back to regex scanner.")

        # Local fallback analysis
        logger.info("Using local regex-based rule analyzer fallback.")
        return cls._analyze_locally(files)

    @staticmethod
    def _analyze_with_gemini(code_context: str) -> Dict[str, Any]:
        """
        Calls Gemini API with JSON output mode.
        """
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        system_instruction = (
            "You are an expert software developer and security auditor. Analyze the following code files. "
            "Identify security vulnerabilities, bugs, code quality problems, and performance issues. "
            "Rate the project and provide actionable issues and refactoring suggestions. "
            "You must respond ONLY with a JSON object matching the following structure:\n"
            "{\n"
            '  "overall_score": 85, // 0 to 100\n'
            '  "summary": "markdown string summarizing findings",\n'
            '  "metrics": { "security": 80, "quality": 90, "performance": 85, "maintainability": 85 },\n'
            '  "issues": [\n'
            '    {\n'
            '      "file_path": "path/to/file.py",\n'
            '      "line_number": 23,\n'
            '      "severity": "critical", // critical, warning, info\n'
            '      "category": "security", // security, quality, performance, bug\n'
            '      "description": "Vulnerability description",\n'
            '      "code_snippet": "bad_code_expression()",\n'
            '      "suggestion": "good_code_replacement()"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction,
            generation_config={"response_mime_type": "application/json"}
        )

        prompt = f"Analyze the following code files:\n{code_context}"
        response = model.generate_content(prompt)
        
        return json.loads(response.text)

    @staticmethod
    def _analyze_with_openai(code_context: str) -> Dict[str, Any]:
        """
        Calls OpenAI API with JSON object response format.
        """
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        system_message = (
            "You are an expert software developer and security auditor. Analyze the provided code files. "
            "Rate the project (0-100) and identify issues. Output ONLY valid JSON containing:\n"
            '- "overall_score": int\n'
            '- "summary": markdown string\n'
            '- "metrics": {"security": int, "quality": int, "performance": int, "maintainability": int}\n'
            '- "issues": list of issues, each having: "file_path", "line_number" (int or null), "severity" ("critical"|"warning"|"info"), "category" ("security"|"quality"|"performance"|"bug"), "description", "code_snippet", "suggestion"'
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Analyze these files:\n{code_context}"}
            ]
        )
        
        return json.loads(response.choices[0].message.content)

    @staticmethod
    def _analyze_locally(files: List[Tuple[str, str]]) -> Dict[str, Any]:
        """
        Regex-based code scanner fallback.
        """
        issues = []
        scores = {"security": 100, "quality": 100, "performance": 100, "maintainability": 100}

        # Check patterns
        hardcoded_secrets = re.compile(
            r'(password|passwd|api_key|secret_key|private_key|token|auth_token)\s*=\s*[\'"][a-zA-Z0-9_\-]{8,}[\'"]', 
            re.IGNORECASE
        )
        sql_injection = re.compile(
            r'execute\(\s*[\'"].*%\s*s.*[\'"]\s*,\s*|execute\(\s*f[\'"].*\{.*\}[\'"]\s*\)|execute\(\s*[\'"].*\+\s*[a-zA-Z0-9_].*[\'"]\)', 
            re.IGNORECASE
        )
        bare_except = re.compile(r'except\s*:')
        console_log = re.compile(r'console\.log\(')
        print_statement = re.compile(r'print\(')
        todo_comment = re.compile(r'#\s*TODO|//\s*TODO', re.IGNORECASE)
        eval_statement = re.compile(r'\beval\(')

        for rel_path, content in files:
            lines = content.splitlines()
            for line_idx, line in enumerate(lines):
                line_num = line_idx + 1

                # 1. Hardcoded secrets
                if hardcoded_secrets.search(line):
                    issues.append({
                        "file_path": rel_path,
                        "line_number": line_num,
                        "severity": "critical",
                        "category": "security",
                        "description": "Potential hardcoded secret or API key identified. Storing secrets in plaintext is highly unsafe.",
                        "code_snippet": line.strip(),
                        "suggestion": "# Load from environment variable instead\nimport os\napi_key = os.environ.get('API_KEY')"
                    })
                    scores["security"] -= 10

                # 2. SQL injection
                elif sql_injection.search(line) and (".py" in rel_path or ".js" in rel_path or ".ts" in rel_path):
                    issues.append({
                        "file_path": rel_path,
                        "line_number": line_num,
                        "severity": "critical",
                        "category": "security",
                        "description": "SQL query built using direct string concatenation. This is vulnerable to SQL Injection.",
                        "code_snippet": line.strip(),
                        "suggestion": "cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))"
                    })
                    scores["security"] -= 15

                # 3. Eval usage
                elif eval_statement.search(line):
                    issues.append({
                        "file_path": rel_path,
                        "line_number": line_num,
                        "severity": "critical",
                        "category": "security",
                        "description": "Use of eval() function is dangerous and highly vulnerable to remote code execution.",
                        "code_snippet": line.strip(),
                        "suggestion": "Use safe JSON parsing or dict mappings instead."
                    })
                    scores["security"] -= 12

                # 4. Bare except
                elif bare_except.search(line) and ".py" in rel_path:
                    issues.append({
                        "file_path": rel_path,
                        "line_number": line_num,
                        "severity": "warning",
                        "category": "quality",
                        "description": "Bare 'except:' caught. This catches SystemExit, KeyboardInterrupt, and masks bugs.",
                        "code_snippet": line.strip(),
                        "suggestion": "except Exception as e:\n    logging.error(f'Error occurred: {e}')"
                    })
                    scores["quality"] -= 5

                # 5. console.log in prod code
                elif console_log.search(line) and (".js" in rel_path or ".ts" in rel_path or ".tsx" in rel_path):
                    issues.append({
                        "file_path": rel_path,
                        "line_number": line_num,
                        "severity": "info",
                        "category": "quality",
                        "description": "Leftover console.log() found. Consider using a dedicated logging library or removing debug statements.",
                        "code_snippet": line.strip(),
                        "suggestion": "// Remove console.log or replace with an enterprise logger\n// logger.info(...);"
                    })
                    scores["quality"] -= 1
                    scores["maintainability"] -= 1

                # 6. python print in backend code
                elif print_statement.search(line) and ".py" in rel_path and "main.py" not in rel_path:
                    issues.append({
                        "file_path": rel_path,
                        "line_number": line_num,
                        "severity": "info",
                        "category": "quality",
                        "description": "Leftover print() statement found. Use a structured logger instead.",
                        "code_snippet": line.strip(),
                        "suggestion": "import logging\nlogging.info('...')"
                    })
                    scores["quality"] -= 1

                # 7. TODO / FIXME
                elif todo_comment.search(line):
                    issues.append({
                        "file_path": rel_path,
                        "line_number": line_num,
                        "severity": "info",
                        "category": "maintainability",
                        "description": "Pending TODO comment identified. Clear technical debt to improve maintainability.",
                        "code_snippet": line.strip(),
                        "suggestion": "Complete the specified implementation task."
                    })
                    scores["maintainability"] -= 2

        # Clamp scores to [10, 100] range
        for key in scores:
            scores[key] = max(10, min(100, scores[key]))

        # Overall score is the average of categories
        overall_score = int(sum(scores.values()) / len(scores))

        # Generate summary
        issue_counts = {
            "critical": len([i for i in issues if i["severity"] == "critical"]),
            "warning": len([i for i in issues if i["severity"] == "warning"]),
            "info": len([i for i in issues if i["severity"] == "info"]),
        }
        
        summary = (
            f"### Static Code Review Complete\n\n"
            f"The local regex-based analyzer scanned the workspace files and rated the project quality at **{overall_score}/100**.\n\n"
            f"#### Issue Breakdown:\n"
            f"- **Critical Security/Bugs:** {issue_counts['critical']}\n"
            f"- **Warnings:** {issue_counts['warning']}\n"
            f"- **Info & Style items:** {issue_counts['info']}\n\n"
            f"Please view the full issues lists for code snippets and refactoring recommendations."
        )

        return {
            "overall_score": overall_score,
            "summary": summary,
            "metrics": scores,
            "issues": issues
        }
