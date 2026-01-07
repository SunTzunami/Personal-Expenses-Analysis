import os
import io
import json
import logging
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.io as pio
import ollama
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Expense AI Analytics Backend")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    data: List[dict]
    prompt: Optional[str] = ""
    model: str
    metadata: str
    currency: str

class AnalyzeResponse(BaseModel):
    result: Optional[str] = None
    fig: Optional[str] = None
    code: Optional[str] = None
    error: Optional[str] = None

PYTHON_ANALYSIS_PROMPT_TEMPLATE = """
You are an Expert Python Data Scientist specialized in Financial Analysis. 
You are analyzing a DataFrame `df` containing expense records.

DataFrame Information:
{metadata}

User's Chosen Currency: {currency}

USER REQUEST: "{prompt}"

GUIDELINES:
1. **ENVIRONMENT & DATA (CRITICAL)**: 
   - **DO NOT RECREATE THE DATAFRAME `df`**.
   - **DO NOT** use `df = pd.DataFrame(...)` or hardcode any data.
   - **DO NOT** import `pandas`, `numpy`, or `io`. They are ALREADY pre-imported and available.
   - The global variable `df` contains the user's actual expense data. USE IT DIRECTLY.
2. **Syntax**: 
   - Use `df[(df['col'] == val) & (df['col2'] == val2)]` (Parentheses are mandatory).
   - Use `.str.contains('pattern', case=False, na=False)` for text searching in columns.
3. **Context & Strategy**:
   - 'NewCategory' = Mapped/High-Level Groups.
   - 'Category' = Original/Raw Categories.
   - 'remarks' = Personal comments/details about the expense.
   - **CRITICAL SEARCH LOGIC**: If the user asks for something (e.g., 'Starbucks', 'Gym', 'Futsal') that is NOT present in the unique values of 'Category' or 'NewCategory', you MUST search for it within the 'remarks' column using `.str.contains()`.
4. **PRIORITIZE TEXT RESULTS**: 
   - For simple questions (e.g., "Most expensive month?", "Total spent on X?"), ALWAYS provide the numeric/text answer in `result`.
   - **SELECTIVE PLOTS**: Only create a `fig` if it adds significant value (e.g., trends, distributions, comparisons). Do not generate a plot for a single number.
   - If a plot is useful, provide BOTH the text `result` and the `fig`.
5. **Output**:
   - Store final text/number answers in `result`.
   - Store Plotly figure objects in `fig`.
   - **DIRECT ASSIGNMENT ONLY**.
   - Output ONLY executable Python code.
   - **NO EXPLANATIONS, NO PREAMBLE, NO CONVERSATIONAL TEXT.**
"""

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    try:
        # 1. Load data into DataFrame
        df = pd.DataFrame(request.data)
        if 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date'])

        # 2. Get Code from LLM
        system_prompt = PYTHON_ANALYSIS_PROMPT_TEMPLATE.format(
            metadata=request.metadata,
            currency=request.currency,
            prompt=request.prompt
        )

        response = ollama.chat(model=request.model, messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': request.prompt}
        ])

        llm_content = response['message']['content'].strip()
        
        # Extract code from markdown blocks if present
        code = llm_content
        if "```python" in code:
            code = code.split("```python")[1].split("```")[0].strip()
        elif "```" in code:
            code = code.split("```")[1].split("```")[0].strip()

        logger.info(f"Executing code: \n{code}")

        # 3. Execute code natively
        exec_scope = {
            "df": df,
            "pd": pd,
            "np": np,
            "px": px,
            "result": None,
            "fig": None
        }

        try:
            exec(code, {}, exec_scope)
        except Exception as e:
            return AnalyzeResponse(error=f"Execution error: {str(e)}", code=code)

        result = exec_scope.get('result')
        fig_obj = exec_scope.get('fig')
        fig_json = None

        if fig_obj is not None:
            if hasattr(fig_obj, 'to_json'):
                fig_json = fig_obj.to_json()
            else:
                fig_json = str(fig_obj)

        # 4. Summarize result if needed
        final_result = str(result) if result is not None else None
        if result is not None and len(str(result)) < 500:
            summary_prompt = f"Summarize the analysis result for the user in one natural sentence. The user's currency is {request.currency}."
            summary_response = ollama.chat(model=request.model, messages=[
                {'role': 'system', 'content': summary_prompt},
                {'role': 'user', 'content': f"Question: {request.prompt}\nResult: {result}"}
            ])
            final_result = summary_response['message']['content'].strip()

        return AnalyzeResponse(
            result=final_result,
            fig=fig_json,
            code=code
        )

    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
