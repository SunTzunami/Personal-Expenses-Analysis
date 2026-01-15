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

# Category Mapping (Mirrors src/utils/categoryMapping.js)
CATEGORY_MAPPING = {
    # Food
    'grocery': 'Food', 'snacks': 'Food', 'cafe': 'Food',
    'coffee': 'Food', 'café': 'Food', 'bento': 'Food', 'beverage': 'Food',
    'eating from combini': 'Food', 'eating out': 'Food', 'eating with friend': 'Food',

    # Housing
    'housing': 'Housing and Utilities', 'utility': 'Housing and Utilities',
    'internet bill': 'Housing and Utilities', 'electricity bill': 'Housing and Utilities',
    'gas bill': 'Housing and Utilities', 'water & sewage bill': 'Housing and Utilities',
    'phone bill': 'Housing and Utilities', 'water': 'Housing and Utilities',

    # Household & Clothing
    'clothing': 'Household and Clothing', 'household': 'Household and Clothing',
    'furniture': 'Electronics and Furniture', 'electronics': 'Electronics and Furniture',

    # Fitness
    'supplements': 'Fitness', 'shoes': 'Fitness', 'sports event': 'Fitness',
    'sports watch': 'Fitness', 'sports clothing': 'Fitness', 'sports rental': 'Fitness',
    'gym': 'Fitness', 'sports equipment': 'Fitness', 'basketball game': 'Fitness',
    'footbal game': 'Fitness', 'futsal game': 'Fitness',

    # Transportation
    'commute': 'Transportation', 'ride share': 'Transportation', 'tokyo metro': 'Transportation',
    'flight tickets': 'Transportation', 'cable car': 'Transportation', 'bus': 'Transportation',
    'shinkansen': 'Transportation', 'car rental': 'Transportation',
    'taxi': 'Transportation', 'stay': 'Transportation',

    # Gifts & Treats
    'souvenirs': 'Souvenirs/Gifts/Treats', 'treat': 'Souvenirs/Gifts/Treats',
    'gift': 'Souvenirs/Gifts/Treats',

    # Misc
    'medicines': 'Miscellaneous', 'personal care': 'Miscellaneous', 'misc': 'Miscellaneous',
    'books': 'Miscellaneous', 'help': 'Miscellaneous',
    'charity': 'Miscellaneous', 'donation': 'Miscellaneous', 'entrance fees': 'Miscellaneous',
    'park entrance fees': 'Miscellaneous', 'healthcare': 'Miscellaneous',

    # Entertainment
    'entertainment': 'Entertainment', 'nomikai': 'Entertainment',
    'activities': 'Entertainment', 'arcades & karaoke': 'Entertainment',
    'events & venues': 'Entertainment',

    # Education
    'education': 'Education',
}

class AnalyzeRequest(BaseModel):
    data: List[dict]
    prompt: Optional[str] = ""
    model: str
    chat_model: Optional[str] = None
    metadata: str
    currency: str
    options: Optional[dict] = None

class AnalyzeResponse(BaseModel):
    result: Optional[str] = None
    fig: Optional[str] = None
    code: Optional[str] = None
    error: Optional[str] = None

def load_prompt_template(filename: str) -> str:
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(base_dir, "utils", "prompts", filename)
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Error loading prompt {filename}: {e}")
        return ""

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    try:
        # 1. Load data into DataFrame
        logger.info(f"--- New Analysis Request ---")
        logger.info(f"User Prompt: {request.prompt}")
        logger.info(f"Model: {request.model}")
        
        df = pd.DataFrame(request.data)
        if 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date']).dt.tz_localize(None)

        # 1b. Enhance DataFrame for Finetuned Model
        # Ensure 'category' is lowercase for matching
        if 'category' in df.columns:
            df['category'] = df['category'].astype(str).str.lower().str.strip()
            
            # Create 'major category' column based on mapping
            # Default to 'Miscellaneous' if not found
            df['major category'] = df['category'].map(lambda x: CATEGORY_MAPPING.get(x, 'Miscellaneous'))
            
            # Handle empty/NaN categories
            df.loc[df['category'] == 'nan', 'major category'] = ''
            df.loc[df['category'] == '', 'major category'] = ''
        else:
            # Create empty columns if missing to prevent Model crash
            df['category'] = ''
            df['major category'] = ''

        # 2. Get Code from LLM
        analysis_template = load_prompt_template("analysis_prompt.txt")
        from datetime import datetime
        current_date_str = datetime.now().strftime("%Y-%m-%d")
        
        system_prompt = analysis_template.format(
            metadata=request.metadata,
            prompt=request.prompt,
            current_date=current_date_str
        )

        logger.info("*" * 50)
        logger.info("system prompt = ")
        logger.info(system_prompt)
        logger.info("*" * 50)

        logger.info(f"Querying LLM ({request.model}) for tool call with options: {request.options}")
        response = ollama.chat(model=request.model, messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': request.prompt}
        ], options=request.options)

        llm_content = response['message']['content'].strip()
        
        # Extract code from markdown blocks if present
        code = llm_content
        if "```python" in code:
            code = code.split("```python")[1].split("```")[0].strip()
        elif "```" in code:
            code = code.split("```")[1].split("```")[0].strip()

        logger.info(f"LLM generated code:\n{code}")

        # 3. Execute code natively
        from utils.analysis_tools import (
            plot_time_series, plot_pie_chart, plot_comparison, 
            plot_stacked_bar, calculate_sum, calculate_average, 
            run_significance_test, run_correlation
        )
        
        exec_scope = {
            "df": df,
            "pd": pd,
            "np": np,
            "px": px,
            "plot_time_series": plot_time_series,
            "plot_pie_chart": plot_pie_chart,
            "plot_comparison": plot_comparison,
            "plot_stacked_bar": plot_stacked_bar,
            "calculate_sum": calculate_sum,
            "calculate_average": calculate_average,
            "run_significance_test": run_significance_test,
            "run_correlation": run_correlation,
            "result": None,
            "fig": None
        }

        try:
            logger.info("Executing generated code...")
            exec(code, {}, exec_scope)
            logger.info("Execution successful.")
            
            # Log the raw result generated by the script
            script_result = exec_scope.get('result')
            logger.info(f"Raw script 'result' value: {script_result}")
        except Exception as e:
            logger.error(f"Execution error: {str(e)}")
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
        # If it's a plot, the tool's 'msg' is usually enough. 
        # For simple numeric/text results, we can often just return them.
        final_result = str(result) if result is not None else None
        
        # Only request LLM summary if:
        # 1. There is no figure (just data)
        # 2. The user specifically asked a question that needs natural language phrasing
        # 3. The tool result isn't already a nice sentence.
        
        should_summarize = fig_obj is None and result is not None and not str(result).startswith("Total") and not str(result).startswith("Average")

        if should_summarize:
            logger.info("Requesting natural language summary from LLM...")
            
            summary_template = load_prompt_template("summary_prompt.txt")
            summary_prompt = summary_template.format(
                result=result,
                request=request
            )

            # Use dedicated chat model if provided, else fallback to code model
            target_model = request.chat_model if request.chat_model else request.model
            
            logger.info(f"Summarizing with {target_model}...")
            summary_response = ollama.chat(model=target_model, messages=[
                {'role': 'system', 'content': summary_prompt},
                {'role': 'user', 'content': f"Question: {request.prompt}\nResult: {result}"}
            ], options=request.options)
            final_result = summary_response['message']['content'].strip()
            logger.info(f"Summary generated: {final_result}")
        else:
            logger.info("Skipping LLM summary, using tool result directly.")
            final_result = str(result) if result is not None else "Analysis complete."

        logger.info("--- Analysis Complete ---")

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
